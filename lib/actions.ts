"use server";

import { revalidatePath } from "next/cache";
import { advanceOrder, confirmOrder, payInvoice } from "@/lib/data/mutations";
import { dataset, notificationRules, settings } from "@/lib/data/store";
import type { OrderStatus } from "@/lib/domain/types";

export interface ActionState {
  ok: boolean;
  message: string;
}

function refresh(orderId?: string) {
  revalidatePath("/console");
  revalidatePath("/console/orders");
  revalidatePath("/console/schedule");
  revalidatePath("/console/invoices");
  revalidatePath("/console/reports");
  revalidatePath("/portal");
  revalidatePath("/catalog");
  if (orderId) {
    revalidatePath(`/console/orders/${orderId}`);
    revalidatePath(`/portal/orders/${orderId}`);
  }
}

export async function confirmOrderAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const orderId = String(formData.get("orderId") ?? "");
  const mode =
    String(formData.get("invoiceMode") ?? "deposit_then_balance") === "full_upfront"
      ? "full_upfront"
      : "deposit_then_balance";

  const result = confirmOrder(orderId, mode);
  refresh(orderId);

  return result.ok
    ? {
        ok: true,
        message: `${result.order?.reference} confirmed. Stock is reserved, documents raised and reminders queued.`,
      }
    : { ok: false, message: result.error ?? "Could not confirm this order." };
}

export async function advanceOrderAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const orderId = String(formData.get("orderId") ?? "");
  const to = String(formData.get("to") ?? "") as OrderStatus;

  const result = advanceOrder(orderId, to);
  refresh(orderId);

  if (!result.ok) return { ok: false, message: result.error ?? "Could not update this order." };

  const messages: Partial<Record<OrderStatus, string>> = {
    quotation_sent: "Quotation sent to the customer.",
    picked_up: "Pickup marked complete. Stock is now with the customer.",
    returned: "Return checked in. Units are back on the shelf.",
    cancelled: "Order cancelled and reserved stock released.",
  };

  return { ok: true, message: messages[to] ?? "Order updated." };
}

export async function payInvoiceAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const invoiceId = String(formData.get("invoiceId") ?? "");
  const reference = `pi_test_${Date.now().toString(36)}`;

  const result = payInvoice(invoiceId, reference);
  refresh(result.order?.id);

  return result.ok
    ? { ok: true, message: `Payment recorded against ${reference}.` }
    : { ok: false, message: result.error ?? "Could not record that payment." };
}

/**
 * Change how many days before a return a reminder fires. Queued reminders that
 * have not gone out yet are rescheduled so the new lead time takes effect now
 * rather than only on the next booking.
 */
export async function updateReminderLeadAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const ruleId = String(formData.get("ruleId") ?? "");
  const leadDays = Number(formData.get("leadDays"));
  const active = formData.get("isActive") !== null;

  if (!Number.isInteger(leadDays) || leadDays < 0 || leadDays > 30) {
    return { ok: false, message: "Lead time has to be a whole number of days between 0 and 30." };
  }

  const rule = notificationRules.find((r) => r.id === ruleId);
  if (!rule) return { ok: false, message: "Reminder rule not found." };

  rule.leadDays = leadDays;
  rule.isActive = active;

  const store = dataset();
  let rescheduled = 0;

  for (const notification of store.notifications) {
    if (notification.ruleId !== ruleId || notification.sentAt) continue;
    const order = store.orders.find((o) => o.id === notification.orderId);
    if (!order) continue;
    notification.scheduledFor = new Date(
      new Date(order.endsAt).getTime() - leadDays * 86_400_000,
    ).toISOString();
    rescheduled += 1;
  }

  settings.notificationLeadDays = leadDays;
  revalidatePath("/console/notifications");
  revalidatePath("/portal/notifications");

  return {
    ok: true,
    message: `Lead time set to ${leadDays} day${leadDays === 1 ? "" : "s"}. ${rescheduled} queued reminder${rescheduled === 1 ? "" : "s"} rescheduled.`,
  };
}

export async function sendNotificationAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("notificationId") ?? "");
  const notification = dataset().notifications.find((n) => n.id === id);

  if (!notification) return { ok: false, message: "Reminder not found." };
  if (notification.sentAt) return { ok: false, message: "That reminder has already gone out." };

  notification.sentAt = new Date().toISOString();
  notification.status = "sent";
  refresh(notification.orderId);

  return { ok: true, message: `Reminder sent to the ${notification.audience.replace("_", " ")}.` };
}
