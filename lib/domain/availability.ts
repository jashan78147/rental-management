import type { Product, Reservation } from "./types";

const BLOCKING: ReadonlySet<string> = new Set(["held", "reserved", "out"]);

export function overlaps(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return new Date(aStart) < new Date(bEnd) && new Date(aEnd) > new Date(bStart);
}

/** Units of a product still free across the whole window. */
export function availableUnits(
  product: Product,
  reservations: Reservation[],
  startsAt: string,
  endsAt: string,
  ignoreOrderId?: string,
): number {
  const committed = reservations
    .filter(
      (r) =>
        r.productId === product.id &&
        r.orderId !== ignoreOrderId &&
        BLOCKING.has(r.status) &&
        overlaps(r.startsAt, r.endsAt, startsAt, endsAt),
    )
    .reduce((sum, r) => sum + r.quantity, 0);

  return Math.max(0, product.totalUnits - committed);
}

export interface DayLoad {
  date: string;
  reserved: number;
  total: number;
  free: number;
}

/** Per-day occupancy for the availability calendar. */
export function dailyLoad(
  product: Product,
  reservations: Reservation[],
  from: Date,
  days: number,
): DayLoad[] {
  const out: DayLoad[] = [];

  for (let i = 0; i < days; i += 1) {
    const dayStart = new Date(from);
    dayStart.setHours(0, 0, 0, 0);
    dayStart.setDate(dayStart.getDate() + i);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const reserved = reservations
      .filter(
        (r) =>
          r.productId === product.id &&
          BLOCKING.has(r.status) &&
          overlaps(r.startsAt, r.endsAt, dayStart.toISOString(), dayEnd.toISOString()),
      )
      .reduce((sum, r) => sum + r.quantity, 0);

    out.push({
      date: dayStart.toISOString().slice(0, 10),
      reserved,
      total: product.totalUnits,
      free: Math.max(0, product.totalUnits - reserved),
    });
  }

  return out;
}

export interface AvailabilityCheck {
  productId: string;
  requested: number;
  available: number;
  ok: boolean;
}

export function checkCart(
  items: { productId: string; quantity: number }[],
  products: Product[],
  reservations: Reservation[],
  startsAt: string,
  endsAt: string,
  ignoreOrderId?: string,
): AvailabilityCheck[] {
  return items.map((item) => {
    const product = products.find((p) => p.id === item.productId);
    const available = product
      ? availableUnits(product, reservations, startsAt, endsAt, ignoreOrderId)
      : 0;
    return {
      productId: item.productId,
      requested: item.quantity,
      available,
      ok: available >= item.quantity,
    };
  });
}

/**
 * Next window of `hours` where at least `quantity` units are free.
 * Used to offer a workable alternative instead of a bare "unavailable".
 */
export function nextFreeWindow(
  product: Product,
  reservations: Reservation[],
  quantity: number,
  desiredStart: string,
  hours: number,
  searchDays = 45,
): { startsAt: string; endsAt: string } | null {
  const cursor = new Date(desiredStart);

  for (let i = 0; i < searchDays; i += 1) {
    const start = new Date(cursor);
    start.setDate(start.getDate() + i);
    const end = new Date(start.getTime() + hours * 3_600_000);
    if (availableUnits(product, reservations, start.toISOString(), end.toISOString()) >= quantity) {
      return { startsAt: start.toISOString(), endsAt: end.toISOString() };
    }
  }

  return null;
}
