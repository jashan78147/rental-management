import { assessLateFee, buildInvoicePlan } from "@/lib/domain/fees";
import { round2 } from "@/lib/domain/pricing";
import { buildQuote } from "@/lib/domain/quote";
import type {
  AppNotification,
  CartItem,
  Delivery,
  Invoice,
  OrderLine,
  OrderStatus,
  Payment,
  RentalOrder,
  Reservation,
} from "@/lib/domain/types";
import { applyChanges, loadDataset, type Changes } from "./persist";
import { lateFeeRules, profileById, settings } from "./store";

export interface MutationResult {
  ok: boolean;
  order?: RentalOrder;
  error?: string;
  shortages?: { productId: string; requested: number; available: number }[];
}

function nextReference(existing: number): string {
  const now = new Date();
  const stamp = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}`;
  return `RO-${stamp}-${String(existing + 160).padStart(4, "0")}`;
}

/**
 * Turn a cart into a draft quotation. Availability is re-checked here rather
 * than trusting whatever the browser last saw, so two people racing for the
 * last generator cannot both succeed.
 */
export async function createOrder(input: {
  items: CartItem[];
  startsAt: string;
  endsAt: string;
  customerId: string;
  notes?: string;
}): Promise<MutationResult> {
  const { items, startsAt, endsAt, customerId, notes } = input;

  if (items.length === 0) return { ok: false, error: "The quotation has no items on it." };
  if (new Date(endsAt) <= new Date(startsAt)) {
    return { ok: false, error: "The return time has to be after the pickup time." };
  }

  // loadDataset warms the people registry, so this resolves self-registered
  // customers as well as the seeded ones.
  const data = await loadDataset();
  if (!profileById(customerId)) return { ok: false, error: "Unknown customer." };
  const quote = buildQuote({ items, startsAt, endsAt, customerId, reservations: data.reservations });

  const shortages = quote.lines
    .filter((line) => line.shortBy > 0)
    .map((line) => ({
      productId: line.productId,
      requested: line.quantity,
      available: line.available,
    }));

  if (shortages.length > 0) {
    return { ok: false, error: "Some items were taken while this quotation was open.", shortages };
  }

  const orderId = `o-${Date.now().toString(36)}`;
  const lines: OrderLine[] = quote.lines.map((line, index) => ({
    id: `${orderId}-l${index + 1}`,
    orderId,
    productId: line.productId,
    quantity: line.quantity,
    unit: line.chunks[0]?.unit ?? "day",
    durationQty: line.chunks[0]?.qty ?? 1,
    unitPrice: line.chunks[0]?.unitPrice ?? 0,
    discount: line.discount,
    lineTotal: line.net,
    breakdown: line.chunks,
  }));

  const order: RentalOrder = {
    id: orderId,
    reference: nextReference(data.orders.length),
    customerId,
    status: "quotation",
    startsAt,
    endsAt,
    pricelistId: quote.pricelistId,
    subtotal: quote.subtotal,
    discountTotal: quote.discountTotal,
    taxTotal: quote.taxTotal,
    depositTotal: quote.depositTotal,
    lateFeeTotal: 0,
    total: quote.total,
    notes,
    createdAt: new Date().toISOString(),
    lines,
  };

  await applyChanges({ orders: [order] });
  return { ok: true, order };
}

/**
 * Confirming a quotation is the moment stock is committed: reservations are
 * written, pickup and return documents are raised, the invoice schedule is
 * created and the return reminders are queued.
 */
export async function confirmOrder(
  orderId: string,
  invoiceMode: "full_upfront" | "deposit_then_balance" = "deposit_then_balance",
): Promise<MutationResult> {
  const data = await loadDataset();
  const order = data.orders.find((o) => o.id === orderId);
  if (!order) return { ok: false, error: "Order not found." };
  if (order.status !== "quotation" && order.status !== "quotation_sent") {
    return { ok: false, error: `This order is already ${order.status.replace(/_/g, " ")}.` };
  }

  const quote = buildQuote({
    items: order.lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
    startsAt: order.startsAt,
    endsAt: order.endsAt,
    customerId: order.customerId,
    reservations: data.reservations,
    ignoreOrderId: order.id,
  });

  const shortages = quote.lines
    .filter((line) => line.shortBy > 0)
    .map((line) => ({
      productId: line.productId,
      requested: line.quantity,
      available: line.available,
    }));

  if (shortages.length > 0) {
    return { ok: false, error: "Stock was committed elsewhere before this was confirmed.", shortages };
  }

  const confirmed: RentalOrder = {
    ...order,
    status: "confirmed",
    confirmedAt: new Date().toISOString(),
  };

  const customer = profileById(order.customerId);

  const reservations: Reservation[] = order.lines.map((line, index) => ({
    id: `r-${order.id}-${index + 1}`,
    orderId: order.id,
    productId: line.productId,
    quantity: line.quantity,
    startsAt: order.startsAt,
    endsAt: order.endsAt,
    status: "reserved",
  }));

  const deliveries: Delivery[] = [
    {
      id: `d-${order.id}-out`,
      orderId: order.id,
      kind: "pickup",
      documentNo: `PU-${order.reference.slice(3)}`,
      scheduledAt: new Date(new Date(order.startsAt).getTime() - 2 * 3_600_000).toISOString(),
      status: "scheduled",
      address: `${customer?.city ?? "Site"} address on file`,
      handler: "Unassigned",
    },
    {
      id: `d-${order.id}-in`,
      orderId: order.id,
      kind: "return",
      documentNo: `RT-${order.reference.slice(3)}`,
      scheduledAt: order.endsAt,
      status: "scheduled",
      address: `${customer?.city ?? "Site"} address on file`,
      handler: "Unassigned",
    },
  ];

  const invoices: Invoice[] = buildInvoicePlan(confirmed, invoiceMode, settings.depositPercent).map(
    (plan) => ({
      id: `i-${order.id}-${plan.kind}`,
      orderId: order.id,
      number: `INV-${order.reference.slice(3)}-${plan.kind[0].toUpperCase()}`,
      kind: plan.kind,
      amount: plan.amount,
      status: "sent" as const,
      issuedAt: new Date().toISOString(),
      dueDate: plan.dueDate,
    }),
  );

  const notifications: AppNotification[] = data.notificationRules
    .filter((rule) => rule.isActive && rule.event === "before_return")
    .map((rule) => ({
      id: `n-${order.id}-${rule.id}`,
      ruleId: rule.id,
      orderId: order.id,
      audience: rule.audience,
      channel: rule.channel,
      subject:
        rule.audience === "customer"
          ? `${order.reference} is due back soon`
          : `Prepare collection for ${order.reference}`,
      body:
        rule.audience === "customer"
          ? `Your rental ${order.reference} returns on ${new Date(order.endsAt).toLocaleString("en-IN")}. Use the portal if you need to extend it.`
          : `Collection run for ${order.reference} (${customer?.fullName}). ${order.lines.length} line items to check in.`,
      scheduledFor: new Date(
        new Date(order.endsAt).getTime() - rule.leadDays * 86_400_000,
      ).toISOString(),
      status: "scheduled" as const,
    }));

  await applyChanges({ orders: [confirmed], reservations, deliveries, invoices, notifications });
  return { ok: true, order: confirmed };
}

/** Move an order along the pickup and return track. */
export async function advanceOrder(orderId: string, to: OrderStatus): Promise<MutationResult> {
  const data = await loadDataset();
  const order = data.orders.find((o) => o.id === orderId);
  if (!order) return { ok: false, error: "Order not found." };

  const allowed: Record<string, OrderStatus[]> = {
    quotation: ["quotation_sent", "cancelled"],
    quotation_sent: ["confirmed", "cancelled"],
    confirmed: ["picked_up", "cancelled"],
    picked_up: ["returned"],
    returned: [],
    cancelled: [],
  };

  if (!allowed[order.status]?.includes(to)) {
    return {
      ok: false,
      error: `An order that is ${order.status.replace(/_/g, " ")} cannot move to ${to.replace(/_/g, " ")}.`,
    };
  }

  const now = new Date().toISOString();
  const changes: Changes = {};
  const updated: RentalOrder = { ...order, status: to };

  const ownReservations = data.reservations.filter((r) => r.orderId === orderId);
  const ownDeliveries = data.deliveries.filter((d) => d.orderId === orderId);
  const ownInvoices = data.invoices.filter((i) => i.orderId === orderId);

  if (to === "picked_up") {
    changes.reservations = ownReservations.map((r) => ({ ...r, status: "out" as const }));

    const pickup = ownDeliveries.find((d) => d.kind === "pickup");
    if (pickup) changes.deliveries = [{ ...pickup, status: "done", completedAt: now }];

    const unpaid = ownInvoices.filter((i) => i.status === "sent" || i.status === "draft");
    changes.invoices = unpaid.map((i) => ({ ...i, status: "paid" as const, paidAt: now }));
    changes.payments = unpaid.map<Payment>((invoice) => ({
      id: `pay-${invoice.id}`,
      invoiceId: invoice.id,
      amount: invoice.amount,
      gateway: settings.gateway,
      gatewayPaymentId: `pi_${invoice.id}`,
      status: "succeeded",
      paidAt: now,
    }));
  }

  if (to === "returned") {
    changes.reservations = ownReservations.map((r) => ({ ...r, status: "returned" as const }));

    const dropoff = ownDeliveries.find((d) => d.kind === "return");
    if (dropoff) changes.deliveries = [{ ...dropoff, status: "done", completedAt: now }];

    // Anything past the due time gets priced against the late fee rules.
    if (Date.now() > new Date(order.endsAt).getTime()) {
      const assessment = assessLateFee(order, lateFeeRules, data.products, new Date());
      if (assessment) {
        // Replace any fee already recorded rather than stacking a second one on
        // top, and reuse the invoice id so a re-assessment updates in place.
        updated.lateFeeTotal = assessment.amount;
        updated.total = round2(order.total - order.lateFeeTotal + assessment.amount);
        changes.invoices = [
          {
            id: `i-${order.id}-late_fee`,
            orderId: order.id,
            number: `INV-${order.reference.slice(3)}-L`,
            kind: "late_fee",
            amount: assessment.amount,
            status: "sent",
            issuedAt: now,
            dueDate: now.slice(0, 10),
          },
        ];
      }
    }
  }

  if (to === "cancelled") {
    changes.reservations = ownReservations.map((r) => ({ ...r, status: "released" as const }));
    changes.deliveries = ownDeliveries
      .filter((d) => d.status !== "done")
      .map((d) => ({ ...d, status: "cancelled" as const }));
    changes.invoices = ownInvoices
      .filter((i) => i.status !== "paid")
      .map((i) => ({ ...i, status: "void" as const }));
  }

  changes.orders = [updated];
  await applyChanges(changes);
  return { ok: true, order: updated };
}

/** Record a gateway payment against an invoice. */
export async function payInvoice(
  invoiceId: string,
  gatewayPaymentId: string,
): Promise<MutationResult> {
  const data = await loadDataset();
  const invoice = data.invoices.find((i) => i.id === invoiceId);
  if (!invoice) return { ok: false, error: "Invoice not found." };
  if (invoice.status === "paid") return { ok: false, error: "That invoice is already paid." };

  const now = new Date().toISOString();

  await applyChanges({
    invoices: [{ ...invoice, status: "paid", paidAt: now }],
    payments: [
      {
        id: `pay-${invoice.id}-${Date.now().toString(36)}`,
        invoiceId: invoice.id,
        amount: invoice.amount,
        gateway: settings.gateway,
        gatewayPaymentId,
        status: "succeeded",
        paidAt: now,
      },
    ],
  });

  return { ok: true, order: data.orders.find((o) => o.id === invoice.orderId) };
}

/** Mark a queued reminder as sent. */
export async function sendNotification(id: string): Promise<MutationResult & { audience?: string }> {
  const data = await loadDataset();
  const notification = data.notifications.find((n) => n.id === id);
  if (!notification) return { ok: false, error: "Reminder not found." };
  if (notification.sentAt) return { ok: false, error: "That reminder has already gone out." };

  const now = new Date().toISOString();
  await applyChanges({ notifications: [{ ...notification, sentAt: now, status: "sent" }] });
  return { ok: true, audience: notification.audience };
}

/**
 * Change how many days before a return a reminder fires. Queued reminders that
 * have not gone out yet are rescheduled so the new lead time takes effect now
 * rather than only on the next booking.
 */
export async function updateReminderRule(
  ruleId: string,
  leadDays: number,
  isActive: boolean,
): Promise<MutationResult & { rescheduled?: number }> {
  const data = await loadDataset();
  const rule = data.notificationRules.find((r) => r.id === ruleId);
  if (!rule) return { ok: false, error: "Reminder rule not found." };

  const notifications: AppNotification[] = [];
  for (const notification of data.notifications) {
    if (notification.ruleId !== ruleId || notification.sentAt) continue;
    const order = data.orders.find((o) => o.id === notification.orderId);
    if (!order) continue;
    notifications.push({
      ...notification,
      scheduledFor: new Date(
        new Date(order.endsAt).getTime() - leadDays * 86_400_000,
      ).toISOString(),
    });
  }

  await applyChanges({ reminderRules: [{ id: ruleId, leadDays, isActive }], notifications });
  return { ok: true, rescheduled: notifications.length };
}
