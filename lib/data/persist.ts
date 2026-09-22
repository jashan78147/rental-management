import { dbConfigured, sql } from "@/lib/db/client";
import { ensureReady, loadFromDb } from "@/lib/db/repo";
import type {
  AppNotification,
  Delivery,
  Invoice,
  Payment,
  RentalOrder,
  Reservation,
} from "@/lib/domain/types";
import { hydratePeople } from "@/lib/auth/accounts";
import { memoryDataset, type Dataset } from "./store";

/**
 * A mutation hands back whole entities rather than field-level patches, and
 * everything is upserted by id. That keeps one implementation of the business
 * rules working against both the database and the in-process fallback.
 */
export interface Changes {
  orders?: RentalOrder[];
  reservations?: Reservation[];
  deliveries?: Delivery[];
  invoices?: Invoice[];
  payments?: Payment[];
  notifications?: AppNotification[];
  reminderRules?: { id: string; leadDays: number; isActive: boolean }[];
}

export async function loadDataset(): Promise<Dataset> {
  // Warm the people registry alongside the data, so any page rendering orders
  // can name a self-registered customer without an await at the lookup.
  const [data] = await Promise.all([
    dbConfigured() ? loadFromDb() : Promise.resolve(memoryDataset()),
    hydratePeople(),
  ]);
  return data;
}

function upsertInto<T extends { id: string }>(list: T[], items: T[]): void {
  for (const item of items) {
    const index = list.findIndex((existing) => existing.id === item.id);
    if (index >= 0) list[index] = item;
    else list.push(item);
  }
}

export async function applyChanges(changes: Changes): Promise<void> {
  if (!dbConfigured()) {
    const store = memoryDataset();
    if (changes.orders) upsertInto(store.orders, changes.orders);
    if (changes.reservations) upsertInto(store.reservations, changes.reservations);
    if (changes.deliveries) upsertInto(store.deliveries, changes.deliveries);
    if (changes.invoices) upsertInto(store.invoices, changes.invoices);
    if (changes.payments) upsertInto(store.payments, changes.payments);
    if (changes.notifications) upsertInto(store.notifications, changes.notifications);
    for (const rule of changes.reminderRules ?? []) {
      const target = store.notificationRules.find((r) => r.id === rule.id);
      if (target) {
        target.leadDays = rule.leadDays;
        target.isActive = rule.isActive;
      }
    }
    return;
  }

  await ensureReady();
  const db = sql();

  for (const order of changes.orders ?? []) {
    await db.query(
      `insert into orders (id, reference, customer_id, status, starts_at, ends_at, pricelist_id,
         subtotal, discount_total, tax_total, deposit_total, late_fee_total, total, notes,
         created_at, confirmed_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       on conflict (id) do update set
         status = excluded.status,
         starts_at = excluded.starts_at,
         ends_at = excluded.ends_at,
         subtotal = excluded.subtotal,
         discount_total = excluded.discount_total,
         tax_total = excluded.tax_total,
         deposit_total = excluded.deposit_total,
         late_fee_total = excluded.late_fee_total,
         total = excluded.total,
         notes = excluded.notes,
         confirmed_at = excluded.confirmed_at`,
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
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         on conflict (id) do update set
           quantity = excluded.quantity,
           unit_price = excluded.unit_price,
           discount = excluded.discount,
           line_total = excluded.line_total,
           breakdown = excluded.breakdown`,
        [
          line.id, line.orderId, line.productId, line.quantity, line.unit, line.durationQty,
          line.unitPrice, line.discount, line.lineTotal, JSON.stringify(line.breakdown), index,
        ],
      );
    }
  }

  for (const r of changes.reservations ?? []) {
    await db.query(
      `insert into reservations (id, order_id, product_id, quantity, starts_at, ends_at, status)
       values ($1,$2,$3,$4,$5,$6,$7)
       on conflict (id) do update set quantity = excluded.quantity, status = excluded.status`,
      [r.id, r.orderId, r.productId, r.quantity, r.startsAt, r.endsAt, r.status],
    );
  }

  for (const d of changes.deliveries ?? []) {
    await db.query(
      `insert into deliveries (id, order_id, kind, document_no, scheduled_at, completed_at,
         status, address, handler, notes)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       on conflict (id) do update set
         scheduled_at = excluded.scheduled_at,
         completed_at = excluded.completed_at,
         status = excluded.status,
         handler = excluded.handler`,
      [
        d.id, d.orderId, d.kind, d.documentNo, d.scheduledAt, d.completedAt ?? null,
        d.status, d.address ?? null, d.handler ?? null, d.notes ?? null,
      ],
    );
  }

  for (const i of changes.invoices ?? []) {
    await db.query(
      `insert into invoices (id, order_id, number, kind, amount, status, due_date, issued_at, paid_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       on conflict (id) do update set
         amount = excluded.amount, status = excluded.status, paid_at = excluded.paid_at`,
      [i.id, i.orderId, i.number, i.kind, i.amount, i.status, i.dueDate ?? null, i.issuedAt, i.paidAt ?? null],
    );
  }

  for (const p of changes.payments ?? []) {
    await db.query(
      `insert into payments (id, invoice_id, amount, gateway, gateway_payment_id, status, paid_at)
       values ($1,$2,$3,$4,$5,$6,$7) on conflict (id) do nothing`,
      [p.id, p.invoiceId, p.amount, p.gateway, p.gatewayPaymentId ?? null, p.status, p.paidAt],
    );
  }

  for (const n of changes.notifications ?? []) {
    await db.query(
      `insert into notifications (id, rule_id, order_id, audience, channel, subject, body,
         scheduled_for, sent_at, status)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       on conflict (id) do update set
         scheduled_for = excluded.scheduled_for,
         sent_at = excluded.sent_at,
         status = excluded.status`,
      [
        n.id, n.ruleId ?? null, n.orderId, n.audience, n.channel, n.subject, n.body,
        n.scheduledFor, n.sentAt ?? null, n.status,
      ],
    );
  }

  for (const rule of changes.reminderRules ?? []) {
    await db.query(
      `insert into reminder_rules (id, lead_days, is_active) values ($1,$2,$3)
       on conflict (id) do update set lead_days = excluded.lead_days, is_active = excluded.is_active`,
      [rule.id, rule.leadDays, rule.isActive],
    );
  }
}
