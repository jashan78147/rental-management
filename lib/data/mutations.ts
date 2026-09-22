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
  RentalOrder,
} from "@/lib/domain/types";
import { dataset, lateFeeRules, notificationRules, profileById, settings } from "./store";

function nextReference(): string {
  const now = new Date();
  const stamp = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const serial = dataset().orders.length + 160;
  return `RO-${stamp}-${String(serial).padStart(4, "0")}`;
}

export interface CreateOrderInput {
  items: CartItem[];
  startsAt: string;
  endsAt: string;
  customerId: string;
  notes?: string;
  invoiceMode?: "full_upfront" | "deposit_then_balance";
}

export interface CreateOrderResult {
  ok: boolean;
  order?: RentalOrder;
  error?: string;
  shortages?: { productId: string; requested: number; available: number }[];
}

/**
 * Turn a cart into a draft quotation. Availability is re-checked here rather
 * than trusting whatever the browser last saw, so two people racing for the
 * last generator cannot both succeed.
 */
export function createOrder(input: CreateOrderInput): CreateOrderResult {
  const { items, startsAt, endsAt, customerId, notes } = input;

  if (items.length === 0) return { ok: false, error: "The quotation has no items on it." };
  if (!profileById(customerId)) return { ok: false, error: "Unknown customer." };
  if (new Date(endsAt) <= new Date(startsAt)) {
    return { ok: false, error: "The return time has to be after the pickup time." };
  }

  const quote = buildQuote({ items, startsAt, endsAt, customerId });

  const shortages = quote.lines
    .filter((line) => line.shortBy > 0)
    .map((line) => ({
      productId: line.productId,
      requested: line.quantity,
      available: line.available,
    }));

  if (shortages.length > 0) {
    return {
      ok: false,
      error: "Some items were taken while this quotation was open.",
      shortages,
    };
  }

  const store = dataset();
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
    reference: nextReference(),
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

  store.orders.unshift(order);
  return { ok: true, order };
}

/**
 * Confirming a quotation is the moment stock is committed: reservations are
 * written, pickup and return documents are raised, the invoice schedule is
 * created and the return reminders are queued.
 */
export function confirmOrder(
  orderId: string,
  invoiceMode: "full_upfront" | "deposit_then_balance" = "deposit_then_balance",
): CreateOrderResult {
  const store = dataset();
  const order = store.orders.find((o) => o.id === orderId);
  if (!order) return { ok: false, error: "Order not found." };
  if (order.status !== "quotation" && order.status !== "quotation_sent") {
    return { ok: false, error: `This order is already ${order.status.replace(/_/g, " ")}.` };
  }

  const quote = buildQuote({
    items: order.lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
    startsAt: order.startsAt,
    endsAt: order.endsAt,
    customerId: order.customerId,
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

  order.status = "confirmed";
  order.confirmedAt = new Date().toISOString();

  order.lines.forEach((line, index) => {
    store.reservations.push({
      id: `r-${order.id}-${index + 1}`,
      orderId: order.id,
      productId: line.productId,
      quantity: line.quantity,
      startsAt: order.startsAt,
      endsAt: order.endsAt,
      status: "reserved",
    });
  });

  const customer = profileById(order.customerId);

  const pickup: Delivery = {
    id: `d-${order.id}-out`,
    orderId: order.id,
    kind: "pickup",
    documentNo: `PU-${order.reference.slice(3)}`,
    scheduledAt: new Date(new Date(order.startsAt).getTime() - 2 * 3_600_000).toISOString(),
    status: "scheduled",
    address: `${customer?.city ?? "Site"} address on file`,
    handler: "Unassigned",
  };

  const dropoff: Delivery = {
    id: `d-${order.id}-in`,
    orderId: order.id,
    kind: "return",
    documentNo: `RT-${order.reference.slice(3)}`,
    scheduledAt: order.endsAt,
    status: "scheduled",
    address: `${customer?.city ?? "Site"} address on file`,
    handler: "Unassigned",
  };

  store.deliveries.push(pickup, dropoff);

  for (const plan of buildInvoicePlan(order, invoiceMode, settings.depositPercent)) {
    const invoice: Invoice = {
      id: `i-${order.id}-${plan.kind}`,
      orderId: order.id,
      number: `INV-${order.reference.slice(3)}-${plan.kind[0].toUpperCase()}`,
      kind: plan.kind,
      amount: plan.amount,
      status: "sent",
      issuedAt: new Date().toISOString(),
      dueDate: plan.dueDate,
    };
    store.invoices.push(invoice);
  }

  for (const rule of notificationRules.filter((r) => r.isActive && r.event === "before_return")) {
    const scheduledFor = new Date(
      new Date(order.endsAt).getTime() - rule.leadDays * 86_400_000,
    ).toISOString();

    const notification: AppNotification = {
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
      scheduledFor,
      status: "scheduled",
    };

    store.notifications.push(notification);
  }

  return { ok: true, order };
}

/** Move an order along the pickup and return track. */
export function advanceOrder(orderId: string, to: OrderStatus): CreateOrderResult {
  const store = dataset();
  const order = store.orders.find((o) => o.id === orderId);
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

  if (to === "picked_up") {
    for (const reservation of store.reservations.filter((r) => r.orderId === orderId)) {
      reservation.status = "out";
    }
    const pickup = store.deliveries.find((d) => d.orderId === orderId && d.kind === "pickup");
    if (pickup) {
      pickup.status = "done";
      pickup.completedAt = now;
    }
    for (const invoice of store.invoices.filter((i) => i.orderId === orderId && i.status === "sent")) {
      invoice.status = "paid";
      invoice.paidAt = now;
      store.payments.push({
        id: `pay-${invoice.id}`,
        invoiceId: invoice.id,
        amount: invoice.amount,
        gateway: settings.gateway,
        gatewayPaymentId: `pi_${invoice.id}`,
        status: "succeeded",
        paidAt: now,
      });
    }
  }

  if (to === "returned") {
    for (const reservation of store.reservations.filter((r) => r.orderId === orderId)) {
      reservation.status = "returned";
    }
    const dropoff = store.deliveries.find((d) => d.orderId === orderId && d.kind === "return");
    if (dropoff) {
      dropoff.status = "done";
      dropoff.completedAt = now;
    }

    // Anything past the due time gets priced against the late fee rules.
    const overdueHours = (Date.now() - new Date(order.endsAt).getTime()) / 3_600_000;
    if (overdueHours > 0) {
      const assessment = assessLateFee(order, lateFeeRules, store.products, new Date());
      if (assessment) {
        order.lateFeeTotal = assessment.amount;
        order.total = round2(order.total + assessment.amount);
        store.invoices.push({
          id: `i-${order.id}-late`,
          orderId: order.id,
          number: `INV-${order.reference.slice(3)}-L`,
          kind: "late_fee",
          amount: assessment.amount,
          status: "sent",
          issuedAt: now,
          dueDate: now.slice(0, 10),
        });
      }
    }
  }

  if (to === "cancelled") {
    for (const reservation of store.reservations.filter((r) => r.orderId === orderId)) {
      reservation.status = "released";
    }
    for (const delivery of store.deliveries.filter((d) => d.orderId === orderId)) {
      if (delivery.status !== "done") delivery.status = "cancelled";
    }
    for (const invoice of store.invoices.filter((i) => i.orderId === orderId && i.status !== "paid")) {
      invoice.status = "void";
    }
  }

  order.status = to;
  return { ok: true, order };
}

/** Record a gateway payment against an invoice. */
export function payInvoice(invoiceId: string, gatewayPaymentId: string): CreateOrderResult {
  const store = dataset();
  const invoice = store.invoices.find((i) => i.id === invoiceId);
  if (!invoice) return { ok: false, error: "Invoice not found." };
  if (invoice.status === "paid") return { ok: false, error: "That invoice is already paid." };

  const now = new Date().toISOString();
  invoice.status = "paid";
  invoice.paidAt = now;

  store.payments.push({
    id: `pay-${invoice.id}-${Date.now().toString(36)}`,
    invoiceId: invoice.id,
    amount: invoice.amount,
    gateway: settings.gateway,
    gatewayPaymentId,
    status: "succeeded",
    paidAt: now,
  });

  return { ok: true, order: store.orders.find((o) => o.id === invoice.orderId) };
}
