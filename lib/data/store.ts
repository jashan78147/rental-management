import { assessLateFee } from "@/lib/domain/fees";
import { priceLine, round2, selectPricelists } from "@/lib/domain/pricing";
import type {
  AppNotification,
  Delivery,
  Invoice,
  NotificationRule,
  OrderLine,
  Payment,
  Product,
  RentalOrder,
  Reservation,
} from "@/lib/domain/types";
import {
  categories,
  lateFeeRules,
  notificationRules as notificationRuleSeeds,
  orderSeeds,
  pricelists,
  products as productSeeds,
  profiles,
  settings,
} from "./seed";

export interface Dataset {
  products: Product[];
  orders: RentalOrder[];
  reservations: Reservation[];
  deliveries: Delivery[];
  invoices: Invoice[];
  payments: Payment[];
  notifications: AppNotification[];
  notificationRules: NotificationRule[];
}

const products: Product[] = productSeeds.map(({ rates: _rates, ...product }) => product);

function isoAt(offsetDays: number, hour: number): string {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString();
}

/**
 * Generate the demo dataset, anchored to today so there is always something
 * overdue, something out with a customer and something upcoming. Used to seed
 * an empty database, and as the whole dataset when no database is attached.
 */
export function buildSeedDataset(): Dataset {
  const orders: RentalOrder[] = [];
  const reservations: Reservation[] = [];
  const deliveries: Delivery[] = [];
  const invoices: Invoice[] = [];
  const payments: Payment[] = [];
  const notifications: AppNotification[] = [];
  const rules = notificationRuleSeeds.map((rule) => ({ ...rule }));

  orderSeeds.forEach((seed, index) => {
    const customer = profiles.find((p) => p.id === seed.customerId)!;
    const startsAt = isoAt(seed.startOffsetDays, 9);
    const endsAt = new Date(
      new Date(startsAt).getTime() + seed.durationHours * 3_600_000,
    ).toISOString();

    const applicable = selectPricelists(pricelists, customer.segment, new Date(startsAt));
    const lists = applicable.length > 0 ? applicable : [pricelists[0]];

    const orderId = `o-${index + 1}`;
    const lines: OrderLine[] = [];
    let subtotal = 0;
    let discountTotal = 0;
    let depositTotal = 0;

    seed.items.forEach((item, lineIndex) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) return;

      const pricing = priceLine({
        product,
        quantity: item.quantity,
        startsAt,
        endsAt,
        pricelists: lists,
      });

      const primary = pricing.chunks[0];
      lines.push({
        id: `${orderId}-l${lineIndex + 1}`,
        orderId,
        productId: product.id,
        quantity: item.quantity,
        unit: primary?.unit ?? product.minDurationUnit,
        durationQty: primary?.qty ?? 1,
        unitPrice: primary?.unitPrice ?? 0,
        discount: pricing.discount,
        lineTotal: pricing.net,
        breakdown: pricing.chunks,
      });

      subtotal += pricing.gross;
      discountTotal += pricing.discount;
      depositTotal += product.depositAmount * item.quantity;
    });

    subtotal = round2(subtotal);
    discountTotal = round2(discountTotal);
    const net = round2(subtotal - discountTotal);
    const taxTotal = round2((net * settings.taxPercent) / 100);

    const committed = seed.status !== "quotation" && seed.status !== "quotation_sent";
    const order: RentalOrder = {
      id: orderId,
      reference: seed.reference,
      customerId: seed.customerId,
      status: seed.status,
      startsAt,
      endsAt,
      pricelistId: lists[0].id,
      subtotal,
      discountTotal,
      taxTotal,
      depositTotal: round2(depositTotal),
      lateFeeTotal: 0,
      total: round2(net + taxTotal),
      notes: seed.notes,
      createdAt: isoAt(seed.startOffsetDays - 6, 11),
      confirmedAt: committed ? isoAt(seed.startOffsetDays - 4, 14) : undefined,
      lines,
    };

    // Late fee only on rows that actually came back late. An overdue rental
    // still with the customer has a projected fee, not a billed one, so it must
    // not carry a lateFeeTotal or an invoice until it is checked in.
    if (seed.returnedLateHours && seed.status === "returned") {
      const returnedAt = new Date(
        new Date(endsAt).getTime() + seed.returnedLateHours * 3_600_000,
      );
      const assessment = assessLateFee(order, lateFeeRules, products, returnedAt);
      if (assessment) {
        order.lateFeeTotal = assessment.amount;
        order.total = round2(order.total + assessment.amount);
      }
    }

    orders.push(order);

    if (!committed) return;

    // Reservation stage: confirming an order sets units aside.
    const reservationStatus =
      seed.status === "returned" ? "returned" : seed.status === "picked_up" ? "out" : "reserved";

    order.lines.forEach((line, lineIndex) => {
      reservations.push({
        id: `r-${orderId}-${lineIndex + 1}`,
        orderId,
        productId: line.productId,
        quantity: line.quantity,
        startsAt,
        endsAt,
        status: reservationStatus,
      });
    });

    const pickedUp = seed.status === "picked_up" || seed.status === "returned";
    deliveries.push({
      id: `d-${orderId}-out`,
      orderId,
      kind: "pickup",
      documentNo: `PU-${seed.reference.slice(3)}`,
      scheduledAt: new Date(new Date(startsAt).getTime() - 2 * 3_600_000).toISOString(),
      completedAt: pickedUp
        ? new Date(new Date(startsAt).getTime() - 3_600_000).toISOString()
        : undefined,
      status: pickedUp ? "done" : "scheduled",
      address: `${customer.city} site address on file`,
      handler: index % 2 === 0 ? "Ravindra Salunkhe" : "Meher Jamshedji",
    });

    const returned = seed.status === "returned";
    const overdue = !returned && new Date(endsAt).getTime() < Date.now();
    deliveries.push({
      id: `d-${orderId}-in`,
      orderId,
      kind: "return",
      documentNo: `RT-${seed.reference.slice(3)}`,
      scheduledAt: endsAt,
      completedAt: returned
        ? new Date(
            new Date(endsAt).getTime() + (seed.returnedLateHours ?? 0) * 3_600_000,
          ).toISOString()
        : undefined,
      status: returned ? "done" : overdue ? "late" : "scheduled",
      address: `${customer.city} site address on file`,
      handler: index % 2 === 0 ? "Meher Jamshedji" : "Ravindra Salunkhe",
    });

    // Invoicing: first instalment now, balance at pickup, late fee after the fact.
    // The refundable security deposit is held separately and is not billed here.
    const depositAmount = round2((order.total * settings.depositPercent) / 100);
    const balance = round2(order.total - depositAmount);

    invoices.push({
      id: `i-${orderId}-dep`,
      orderId,
      number: `INV-${seed.reference.slice(3)}-D`,
      kind: "deposit",
      amount: depositAmount,
      status: "paid",
      issuedAt: order.confirmedAt!,
      paidAt: order.confirmedAt!,
      dueDate: order.confirmedAt!.slice(0, 10),
    });
    payments.push({
      id: `pay-${orderId}-dep`,
      invoiceId: `i-${orderId}-dep`,
      amount: depositAmount,
      gateway: settings.gateway,
      gatewayPaymentId: `pi_${orderId}_dep_${seed.reference.slice(-4)}`,
      status: "succeeded",
      paidAt: order.confirmedAt!,
    });

    if (balance > 0) {
      const balancePaid = pickedUp;
      invoices.push({
        id: `i-${orderId}-bal`,
        orderId,
        number: `INV-${seed.reference.slice(3)}-B`,
        kind: "balance",
        amount: balance,
        status: balancePaid ? "paid" : "sent",
        issuedAt: order.confirmedAt!,
        paidAt: balancePaid ? startsAt : undefined,
        dueDate: startsAt.slice(0, 10),
      });
      if (balancePaid) {
        payments.push({
          id: `pay-${orderId}-bal`,
          invoiceId: `i-${orderId}-bal`,
          amount: balance,
          gateway: settings.gateway,
          gatewayPaymentId: `pi_${orderId}_bal_${seed.reference.slice(-4)}`,
          status: "succeeded",
          paidAt: startsAt,
        });
      }
    }

    if (order.lateFeeTotal > 0) {
      invoices.push({
        id: `i-${orderId}-late_fee`,
        orderId,
        number: `INV-${seed.reference.slice(3)}-L`,
        kind: "late_fee",
        amount: order.lateFeeTotal,
        status: returned ? "paid" : "sent",
        issuedAt: endsAt,
        paidAt: returned ? endsAt : undefined,
        dueDate: endsAt.slice(0, 10),
      });
    }

    rules
      .filter((rule) => rule.isActive && rule.event === "before_return")
      .forEach((rule) => {
        const scheduledFor = new Date(
          new Date(endsAt).getTime() - rule.leadDays * 86_400_000,
        ).toISOString();
        const due = new Date(scheduledFor).getTime() <= Date.now();

        notifications.push({
          id: `n-${orderId}-${rule.id}`,
          ruleId: rule.id,
          orderId,
          audience: rule.audience,
          channel: rule.channel,
          subject:
            rule.audience === "customer"
              ? `${seed.reference} is due back on ${new Date(endsAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`
              : `Prepare collection for ${seed.reference}`,
          body:
            rule.audience === "customer"
              ? `Your rental ${seed.reference} is scheduled to return on ${new Date(endsAt).toLocaleString("en-IN")}. Reply to this mail or use the portal if you need to extend.`
              : `Collection run for ${seed.reference} (${customer.fullName}, ${customer.city}). ${order.lines.length} line items to check in.`,
          scheduledFor,
          sentAt: due ? scheduledFor : undefined,
          status: due ? "sent" : "scheduled",
        });
      });
  });

  return {
    products,
    orders,
    reservations,
    deliveries,
    invoices,
    payments,
    notifications,
    notificationRules: rules,
  };
}

declare global {
  var __bandobastDataset: Dataset | undefined;
}

/**
 * Fallback store for when no database is attached: one dataset per server
 * process. Fine locally, where there is exactly one process; on serverless each
 * function gets its own copy, which is why the database exists.
 */
export function memoryDataset(): Dataset {
  if (!globalThis.__bandobastDataset) {
    globalThis.__bandobastDataset = buildSeedDataset();
  }
  return globalThis.__bandobastDataset;
}

export {
  categories,
  lateFeeRules,
  notificationRuleSeeds as notificationRules,
  pricelists,
  profiles,
  settings,
};
export const allProducts = products;

export function productById(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}

export function productBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function categoryById(id: string) {
  return categories.find((c) => c.id === id);
}

export function profileById(id: string) {
  return profiles.find((p) => p.id === id);
}
