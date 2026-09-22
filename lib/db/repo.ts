import type {
  AppNotification,
  Delivery,
  Invoice,
  NotificationRule,
  OrderLine,
  Payment,
  RentalOrder,
  Reservation,
} from "@/lib/domain/types";
import { allProducts, buildSeedDataset, type Dataset } from "@/lib/data/store";
import { notificationRules as ruleSeeds } from "@/lib/data/seed";
import { dbConfigured, sql } from "./client";

/* -------------------------------------------------------------------------- */
/* Schema                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Only transactional state is persisted. The catalog, pricelists, customers and
 * fee rules are configuration that ships with the code, so they stay as
 * constants and every lookup against them stays synchronous.
 */
const DDL = [
  `create table if not exists orders (
     id text primary key,
     reference text not null unique,
     customer_id text not null,
     status text not null,
     starts_at timestamptz not null,
     ends_at timestamptz not null,
     pricelist_id text,
     subtotal numeric(12,2) not null default 0,
     discount_total numeric(12,2) not null default 0,
     tax_total numeric(12,2) not null default 0,
     deposit_total numeric(12,2) not null default 0,
     late_fee_total numeric(12,2) not null default 0,
     total numeric(12,2) not null default 0,
     notes text,
     created_at timestamptz not null default now(),
     confirmed_at timestamptz
   )`,
  `create table if not exists order_lines (
     id text primary key,
     order_id text not null references orders(id) on delete cascade,
     product_id text not null,
     quantity integer not null,
     unit text not null,
     duration_qty integer not null,
     unit_price numeric(12,2) not null,
     discount numeric(12,2) not null default 0,
     line_total numeric(12,2) not null,
     breakdown jsonb not null default '[]'::jsonb,
     position integer not null default 0
   )`,
  `create table if not exists reservations (
     id text primary key,
     order_id text not null references orders(id) on delete cascade,
     product_id text not null,
     quantity integer not null,
     starts_at timestamptz not null,
     ends_at timestamptz not null,
     status text not null
   )`,
  `create table if not exists deliveries (
     id text primary key,
     order_id text not null references orders(id) on delete cascade,
     kind text not null,
     document_no text not null,
     scheduled_at timestamptz not null,
     completed_at timestamptz,
     status text not null,
     address text,
     handler text,
     notes text
   )`,
  `create table if not exists invoices (
     id text primary key,
     order_id text not null references orders(id) on delete cascade,
     number text not null,
     kind text not null,
     amount numeric(12,2) not null,
     status text not null,
     due_date date,
     issued_at timestamptz not null default now(),
     paid_at timestamptz
   )`,
  `create table if not exists payments (
     id text primary key,
     invoice_id text not null,
     amount numeric(12,2) not null,
     gateway text not null,
     gateway_payment_id text,
     status text not null,
     paid_at timestamptz not null default now()
   )`,
  `create table if not exists notifications (
     id text primary key,
     rule_id text,
     order_id text not null references orders(id) on delete cascade,
     audience text not null,
     channel text not null,
     subject text not null,
     body text not null,
     scheduled_for timestamptz not null,
     sent_at timestamptz,
     status text not null
   )`,
  `create table if not exists reminder_rules (
     id text primary key,
     lead_days integer not null,
     is_active boolean not null default true
   )`,
  `create index if not exists reservations_lookup on reservations (product_id, starts_at, ends_at)`,
  `create index if not exists order_lines_order on order_lines (order_id)`,
  `create index if not exists deliveries_schedule on deliveries (scheduled_at)`,
  `create index if not exists invoices_order on invoices (order_id)`,
  `create index if not exists notifications_due on notifications (scheduled_for)`,
];

/* -------------------------------------------------------------------------- */
/* Row mapping. Postgres returns numeric as string and timestamptz as Date.    */
/* -------------------------------------------------------------------------- */

type Row = Record<string, unknown>;

const num = (v: unknown): number => (v == null ? 0 : Number(v));
const str = (v: unknown): string | undefined => (v == null ? undefined : String(v));

function iso(v: unknown): string {
  if (v == null) return new Date(0).toISOString();
  return v instanceof Date ? v.toISOString() : new Date(String(v)).toISOString();
}

function isoOrNone(v: unknown): string | undefined {
  if (v == null) return undefined;
  return v instanceof Date ? v.toISOString() : new Date(String(v)).toISOString();
}

function dateOnly(v: unknown): string | undefined {
  if (v == null) return undefined;
  return v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10);
}

/* -------------------------------------------------------------------------- */
/* Bootstrap                                                                   */
/* -------------------------------------------------------------------------- */

let ready: Promise<void> | null = null;

async function bootstrap(): Promise<void> {
  const db = sql();

  for (const statement of DDL) {
    await db.query(statement);
  }

  const [{ count }] = (await db.query("select count(*)::int as count from orders")) as Row[];
  if (num(count) > 0) return;

  await seed();
}

/** Write the generated demo dataset into an empty database. */
export async function seed(): Promise<void> {
  const data = buildSeedDataset();
  const db = sql();

  for (const order of data.orders) {
    await db.query(
      `insert into orders (id, reference, customer_id, status, starts_at, ends_at, pricelist_id,
         subtotal, discount_total, tax_total, deposit_total, late_fee_total, total, notes,
         created_at, confirmed_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       on conflict (id) do nothing`,
      [
        order.id, order.reference, order.customerId, order.status, order.startsAt, order.endsAt,
        order.pricelistId ?? null, order.subtotal, order.discountTotal, order.taxTotal,
        order.depositTotal, order.lateFeeTotal, order.total, order.notes ?? null,
        order.createdAt, order.confirmedAt ?? null,
      ],
    );

    for (const [index, line] of order.lines.entries()) {
      await db.query(
        `insert into order_lines (id, order_id, product_id, quantity, unit, duration_qty,
           unit_price, discount, line_total, breakdown, position)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) on conflict (id) do nothing`,
        [
          line.id, line.orderId, line.productId, line.quantity, line.unit, line.durationQty,
          line.unitPrice, line.discount, line.lineTotal, JSON.stringify(line.breakdown), index,
        ],
      );
    }
  }

  for (const r of data.reservations) {
    await db.query(
      `insert into reservations (id, order_id, product_id, quantity, starts_at, ends_at, status)
       values ($1,$2,$3,$4,$5,$6,$7) on conflict (id) do nothing`,
      [r.id, r.orderId, r.productId, r.quantity, r.startsAt, r.endsAt, r.status],
    );
  }

  for (const d of data.deliveries) {
    await db.query(
      `insert into deliveries (id, order_id, kind, document_no, scheduled_at, completed_at,
         status, address, handler, notes)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) on conflict (id) do nothing`,
      [
        d.id, d.orderId, d.kind, d.documentNo, d.scheduledAt, d.completedAt ?? null,
        d.status, d.address ?? null, d.handler ?? null, d.notes ?? null,
      ],
    );
  }

  for (const i of data.invoices) {
    await db.query(
      `insert into invoices (id, order_id, number, kind, amount, status, due_date, issued_at, paid_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9) on conflict (id) do nothing`,
      [i.id, i.orderId, i.number, i.kind, i.amount, i.status, i.dueDate ?? null, i.issuedAt, i.paidAt ?? null],
    );
  }

  for (const p of data.payments) {
    await db.query(
      `insert into payments (id, invoice_id, amount, gateway, gateway_payment_id, status, paid_at)
       values ($1,$2,$3,$4,$5,$6,$7) on conflict (id) do nothing`,
      [p.id, p.invoiceId, p.amount, p.gateway, p.gatewayPaymentId ?? null, p.status, p.paidAt],
    );
  }

  for (const n of data.notifications) {
    await db.query(
      `insert into notifications (id, rule_id, order_id, audience, channel, subject, body,
         scheduled_for, sent_at, status)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) on conflict (id) do nothing`,
      [
        n.id, n.ruleId ?? null, n.orderId, n.audience, n.channel, n.subject, n.body,
        n.scheduledFor, n.sentAt ?? null, n.status,
      ],
    );
  }

  for (const rule of ruleSeeds) {
    await db.query(
      `insert into reminder_rules (id, lead_days, is_active) values ($1,$2,$3)
       on conflict (id) do nothing`,
      [rule.id, rule.leadDays, rule.isActive],
    );
  }
}

export async function ensureReady(): Promise<void> {
  if (!ready) {
    ready = bootstrap().catch((error) => {
      // Let the next request retry rather than caching a failed bootstrap.
      ready = null;
      throw error;
    });
  }
  return ready;
}

/** Drop every transactional row and re-seed, so a demo can start clean. */
export async function resetToSeed(): Promise<void> {
  const db = sql();
  await ensureReady();
  await db.query("delete from payments");
  await db.query("delete from notifications");
  await db.query("delete from invoices");
  await db.query("delete from deliveries");
  await db.query("delete from reservations");
  await db.query("delete from order_lines");
  await db.query("delete from orders");
  await db.query("delete from reminder_rules");
  await seed();
}

/* -------------------------------------------------------------------------- */
/* Load                                                                        */
/* -------------------------------------------------------------------------- */

export async function loadFromDb(): Promise<Dataset> {
  await ensureReady();
  const db = sql();

  const [orderRows, lineRows, reservationRows, deliveryRows, invoiceRows, paymentRows, notificationRows, ruleRows] =
    (await Promise.all([
      db.query("select * from orders"),
      db.query("select * from order_lines order by position asc"),
      db.query("select * from reservations"),
      db.query("select * from deliveries"),
      db.query("select * from invoices"),
      db.query("select * from payments"),
      db.query("select * from notifications"),
      db.query("select * from reminder_rules"),
    ])) as Row[][];

  const linesByOrder = new Map<string, OrderLine[]>();
  for (const row of lineRows) {
    const line: OrderLine = {
      id: String(row.id),
      orderId: String(row.order_id),
      productId: String(row.product_id),
      quantity: num(row.quantity),
      unit: String(row.unit) as OrderLine["unit"],
      durationQty: num(row.duration_qty),
      unitPrice: num(row.unit_price),
      discount: num(row.discount),
      lineTotal: num(row.line_total),
      breakdown: (typeof row.breakdown === "string"
        ? JSON.parse(row.breakdown)
        : (row.breakdown ?? [])) as OrderLine["breakdown"],
    };
    linesByOrder.set(line.orderId, [...(linesByOrder.get(line.orderId) ?? []), line]);
  }

  const orders: RentalOrder[] = orderRows.map((row) => ({
    id: String(row.id),
    reference: String(row.reference),
    customerId: String(row.customer_id),
    status: String(row.status) as RentalOrder["status"],
    startsAt: iso(row.starts_at),
    endsAt: iso(row.ends_at),
    pricelistId: str(row.pricelist_id),
    subtotal: num(row.subtotal),
    discountTotal: num(row.discount_total),
    taxTotal: num(row.tax_total),
    depositTotal: num(row.deposit_total),
    lateFeeTotal: num(row.late_fee_total),
    total: num(row.total),
    notes: str(row.notes),
    createdAt: iso(row.created_at),
    confirmedAt: isoOrNone(row.confirmed_at),
    lines: linesByOrder.get(String(row.id)) ?? [],
  }));

  const reservations: Reservation[] = reservationRows.map((row) => ({
    id: String(row.id),
    orderId: String(row.order_id),
    productId: String(row.product_id),
    quantity: num(row.quantity),
    startsAt: iso(row.starts_at),
    endsAt: iso(row.ends_at),
    status: String(row.status) as Reservation["status"],
  }));

  const deliveries: Delivery[] = deliveryRows.map((row) => ({
    id: String(row.id),
    orderId: String(row.order_id),
    kind: String(row.kind) as Delivery["kind"],
    documentNo: String(row.document_no),
    scheduledAt: iso(row.scheduled_at),
    completedAt: isoOrNone(row.completed_at),
    status: String(row.status) as Delivery["status"],
    address: str(row.address),
    handler: str(row.handler),
    notes: str(row.notes),
  }));

  const invoices: Invoice[] = invoiceRows.map((row) => ({
    id: String(row.id),
    orderId: String(row.order_id),
    number: String(row.number),
    kind: String(row.kind) as Invoice["kind"],
    amount: num(row.amount),
    status: String(row.status) as Invoice["status"],
    dueDate: dateOnly(row.due_date),
    issuedAt: iso(row.issued_at),
    paidAt: isoOrNone(row.paid_at),
  }));

  const payments: Payment[] = paymentRows.map((row) => ({
    id: String(row.id),
    invoiceId: String(row.invoice_id),
    amount: num(row.amount),
    gateway: String(row.gateway),
    gatewayPaymentId: str(row.gateway_payment_id),
    status: String(row.status),
    paidAt: iso(row.paid_at),
  }));

  const notifications: AppNotification[] = notificationRows.map((row) => ({
    id: String(row.id),
    ruleId: str(row.rule_id),
    orderId: String(row.order_id),
    audience: String(row.audience) as AppNotification["audience"],
    channel: String(row.channel) as AppNotification["channel"],
    subject: String(row.subject),
    body: String(row.body),
    scheduledFor: iso(row.scheduled_for),
    sentAt: isoOrNone(row.sent_at),
    status: String(row.status) as AppNotification["status"],
  }));

  // Lead times are editable, so the stored row wins over the seeded default.
  const overrides = new Map(ruleRows.map((row) => [String(row.id), row]));
  const notificationRules: NotificationRule[] = ruleSeeds.map((rule) => {
    const row = overrides.get(rule.id);
    return row
      ? { ...rule, leadDays: num(row.lead_days), isActive: Boolean(row.is_active) }
      : { ...rule };
  });

  return {
    products: allProducts,
    orders,
    reservations,
    deliveries,
    invoices,
    payments,
    notifications,
    notificationRules,
  };
}

export { dbConfigured };
