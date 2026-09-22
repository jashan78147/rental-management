import type { Dataset } from "@/lib/data/store";
import { categoryById, productById, profileById } from "@/lib/data/store";
import { round2 } from "./pricing";
import type { OrderStatus, RentalOrder } from "./types";

export type PeriodKey = "30d" | "90d" | "180d" | "365d";

export const PERIODS: { key: PeriodKey; label: string; days: number }[] = [
  { key: "30d", label: "Last 30 days", days: 30 },
  { key: "90d", label: "Last 90 days", days: 90 },
  { key: "180d", label: "Last 6 months", days: 180 },
  { key: "365d", label: "Last 12 months", days: 365 },
];

const REVENUE_STATUSES: OrderStatus[] = ["confirmed", "picked_up", "returned"];

export function periodDays(key: PeriodKey): number {
  return PERIODS.find((p) => p.key === key)?.days ?? 90;
}

export function ordersInPeriod(
  store: Dataset,
  key: PeriodKey,
  now: Date = new Date(),
): RentalOrder[] {
  const cutoff = now.getTime() - periodDays(key) * 86_400_000;
  return store.orders.filter((o) => new Date(o.startsAt).getTime() >= cutoff);
}

export interface Headline {
  revenue: number;
  bookedOrders: number;
  quotationValue: number;
  quotationCount: number;
  lateFees: number;
  conversionRate: number;
  /** Share of the fleet that moved in the period, measured in unit-days. */
  utilisation: number;
  /** Units physically with customers right now. */
  unitsOnHire: number;
  onTimeRate: number;
}

export function headline(store: Dataset, key: PeriodKey, now: Date = new Date()): Headline {
  const orders = ordersInPeriod(store, key, now);
  const booked = orders.filter((o) => REVENUE_STATUSES.includes(o.status));
  const quotations = orders.filter(
    (o) => o.status === "quotation" || o.status === "quotation_sent",
  );

  const revenue = round2(booked.reduce((sum, o) => sum + o.total, 0));
  const lateFees = round2(booked.reduce((sum, o) => sum + o.lateFeeTotal, 0));

  const returnDocs = store.deliveries.filter((d) => d.kind === "return" && d.status === "done");
  const onTime = returnDocs.filter(
    (d) => !d.completedAt || new Date(d.completedAt) <= new Date(d.scheduledAt),
  ).length;

  // Utilisation is measured against the fleet that actually moved in the period.
  // Whole-fleet utilisation is misleading here: half the unit count is bulk
  // staging that only ships for events, so it would read near zero in a month
  // with no large build. Reservations are clipped to the window so a booking
  // that starts before it cannot contribute days the window never contained.
  const days = periodDays(key);
  const windowStart = now.getTime() - days * 86_400_000;
  const windowEnd = now.getTime();

  const soldByProduct = new Map<string, number>();
  let soldUnitDays = 0;

  for (const reservation of store.reservations) {
    if (reservation.status === "released") continue;
    const from = Math.max(new Date(reservation.startsAt).getTime(), windowStart);
    const to = Math.min(new Date(reservation.endsAt).getTime(), windowEnd);
    const span = Math.max(0, (to - from) / 86_400_000);
    if (span === 0) continue;
    const unitDays = reservation.quantity * span;
    soldUnitDays += unitDays;
    soldByProduct.set(
      reservation.productId,
      (soldByProduct.get(reservation.productId) ?? 0) + unitDays,
    );
  }

  const activeUnitDays = store.products
    .filter((p) => soldByProduct.has(p.id))
    .reduce((sum, p) => sum + p.totalUnits * days, 0);

  const unitsOnHire = store.reservations
    .filter(
      (r) =>
        r.status === "out" &&
        new Date(r.startsAt).getTime() <= windowEnd &&
        new Date(r.endsAt).getTime() >= windowEnd,
    )
    .reduce((sum, r) => sum + r.quantity, 0);

  return {
    revenue,
    bookedOrders: booked.length,
    quotationValue: round2(quotations.reduce((sum, o) => sum + o.total, 0)),
    quotationCount: quotations.length,
    lateFees,
    conversionRate: orders.length ? round2((booked.length / orders.length) * 100) : 0,
    utilisation: activeUnitDays ? round2((soldUnitDays / activeUnitDays) * 100) : 0,
    unitsOnHire,
    onTimeRate: returnDocs.length ? round2((onTime / returnDocs.length) * 100) : 100,
  };
}

export interface ProductRow {
  productId: string;
  name: string;
  category: string;
  timesRented: number;
  unitsOut: number;
  revenue: number;
  utilisation: number;
}

export function topProducts(
  store: Dataset,
  key: PeriodKey,
  limit = 8,
  now: Date = new Date(),
): ProductRow[] {
  const orders = ordersInPeriod(store, key, now).filter((o) => REVENUE_STATUSES.includes(o.status));
  const rows = new Map<string, ProductRow>();
  const days = periodDays(key);

  for (const order of orders) {
    for (const line of order.lines) {
      const product = productById(line.productId);
      if (!product) continue;

      const existing = rows.get(line.productId) ?? {
        productId: line.productId,
        name: product.name,
        category: categoryById(product.categoryId)?.name ?? "Uncategorised",
        timesRented: 0,
        unitsOut: 0,
        revenue: 0,
        utilisation: 0,
      };

      const spanDays = Math.max(
        1,
        (new Date(order.endsAt).getTime() - new Date(order.startsAt).getTime()) / 86_400_000,
      );

      existing.timesRented += 1;
      existing.unitsOut += line.quantity;
      existing.revenue = round2(existing.revenue + line.lineTotal);
      existing.utilisation = round2(
        existing.utilisation + ((line.quantity * spanDays) / (product.totalUnits * days)) * 100,
      );

      rows.set(line.productId, existing);
    }
  }

  return [...rows.values()].sort((a, b) => b.revenue - a.revenue).slice(0, limit);
}

export interface CustomerRow {
  customerId: string;
  name: string;
  segment: string;
  city: string;
  orders: number;
  revenue: number;
  lateReturns: number;
}

export function topCustomers(
  store: Dataset,
  key: PeriodKey,
  limit = 6,
  now: Date = new Date(),
): CustomerRow[] {
  const orders = ordersInPeriod(store, key, now).filter((o) => REVENUE_STATUSES.includes(o.status));
  const rows = new Map<string, CustomerRow>();

  for (const order of orders) {
    const profile = profileById(order.customerId);
    if (!profile) continue;

    const existing = rows.get(order.customerId) ?? {
      customerId: order.customerId,
      name: profile.fullName,
      segment: profile.segment,
      city: profile.city ?? "",
      orders: 0,
      revenue: 0,
      lateReturns: 0,
    };

    existing.orders += 1;
    existing.revenue = round2(existing.revenue + order.total);
    if (order.lateFeeTotal > 0) existing.lateReturns += 1;

    rows.set(order.customerId, existing);
  }

  return [...rows.values()].sort((a, b) => b.revenue - a.revenue).slice(0, limit);
}

export interface TrendPoint {
  label: string;
  revenue: number;
  orders: number;
}

/** Revenue bucketed across the period, oldest first. */
export function revenueTrend(
  store: Dataset,
  key: PeriodKey,
  now: Date = new Date(),
): TrendPoint[] {
  const days = periodDays(key);
  const buckets = Math.min(12, Math.max(4, Math.round(days / 14)));
  const bucketMs = (days * 86_400_000) / buckets;
  const start = now.getTime() - days * 86_400_000;

  const points: TrendPoint[] = Array.from({ length: buckets }, (_, i) => ({
    label: new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(
      new Date(start + i * bucketMs),
    ),
    revenue: 0,
    orders: 0,
  }));

  for (const order of store.orders) {
    if (!REVENUE_STATUSES.includes(order.status)) continue;
    const t = new Date(order.startsAt).getTime();
    if (t < start || t > now.getTime()) continue;
    const index = Math.min(buckets - 1, Math.floor((t - start) / bucketMs));
    points[index].revenue = round2(points[index].revenue + order.total);
    points[index].orders += 1;
  }

  return points;
}

export interface CategoryRow {
  category: string;
  revenue: number;
  share: number;
}

export function categoryMix(
  store: Dataset,
  key: PeriodKey,
  now: Date = new Date(),
): CategoryRow[] {
  const orders = ordersInPeriod(store, key, now).filter((o) => REVENUE_STATUSES.includes(o.status));
  const totals = new Map<string, number>();

  for (const order of orders) {
    for (const line of order.lines) {
      const product = productById(line.productId);
      if (!product) continue;
      const name = categoryById(product.categoryId)?.name ?? "Uncategorised";
      totals.set(name, round2((totals.get(name) ?? 0) + line.lineTotal));
    }
  }

  const grand = [...totals.values()].reduce((a, b) => a + b, 0);
  return [...totals.entries()]
    .map(([category, revenue]) => ({
      category,
      revenue,
      share: grand ? round2((revenue / grand) * 100) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

export interface LateRow {
  reference: string;
  customer: string;
  dueAt: string;
  returnedAt?: string;
  hoursLate: number;
  fee: number;
}

export function lateReturns(store: Dataset, key: PeriodKey, now: Date = new Date()): LateRow[] {
  const cutoff = now.getTime() - periodDays(key) * 86_400_000;

  return store.deliveries
    .filter((d) => d.kind === "return" && new Date(d.scheduledAt).getTime() >= cutoff)
    .map((d): LateRow | null => {
      const order = store.orders.find((o) => o.id === d.orderId);
      if (!order) return null;
      const end = new Date(d.completedAt ?? now.toISOString()).getTime();
      const due = new Date(d.scheduledAt).getTime();
      const hoursLate = (end - due) / 3_600_000;
      if (hoursLate <= 0) return null;

      return {
        reference: order.reference,
        customer: profileById(order.customerId)?.fullName ?? "Unknown",
        dueAt: d.scheduledAt,
        returnedAt: d.completedAt,
        hoursLate: Math.round(hoursLate * 10) / 10,
        fee: order.lateFeeTotal,
      };
    })
    .filter((row): row is LateRow => row !== null)
    .sort((a, b) => b.hoursLate - a.hoursLate);
}

/** Everything the report page and the CSV/XLSX/PDF exports read from. */
export function reportBundle(store: Dataset, key: PeriodKey, now: Date = new Date()) {
  return {
    period: PERIODS.find((p) => p.key === key)!,
    headline: headline(store, key, now),
    products: topProducts(store, key, 10, now),
    customers: topCustomers(store, key, 8, now),
    trend: revenueTrend(store, key, now),
    categories: categoryMix(store, key, now),
    late: lateReturns(store, key, now),
  };
}

export type ReportBundle = ReturnType<typeof reportBundle>;
