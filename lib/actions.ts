"use server";

import { revalidatePath } from "next/cache";
import {
  advanceOrder,
  confirmOrder,
  payInvoice,
  sendNotification,
  updateReminderRule,
} from "@/lib/data/mutations";
import { resetToSeed } from "@/lib/db/repo";
import { dbConfigured } from "@/lib/db/client";
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
  revalidatePath("/console/notifications");
  revalidatePath("/console/products");
  revalidatePath("/portal");
  revalidatePath("/portal/invoices");
  revalidatePath("/portal/notifications");
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

  const result = await confirmOrder(orderId, mode);
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

  const result = await advanceOrder(orderId, to);
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

  const result = await payInvoice(invoiceId, reference);
  refresh(result.order?.id);

  return result.ok
    ? { ok: true, message: `Payment recorded against ${reference}.` }
    : { ok: false, message: result.error ?? "Could not record that payment." };
}

export async function updateReminderLeadAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const ruleId = String(formData.get("ruleId") ?? "");
  const leadDays = Number(formData.get("leadDays"));
  const isActive = formData.get("isActive") !== null;

  if (!Number.isInteger(leadDays) || leadDays < 0 || leadDays > 30) {
    return { ok: false, message: "Lead time has to be a whole number of days between 0 and 30." };
  }

  const result = await updateReminderRule(ruleId, leadDays, isActive);
  refresh();

  if (!result.ok) return { ok: false, message: result.error ?? "Could not update that rule." };

  const count = result.rescheduled ?? 0;
  return {
    ok: true,
    message: `Lead time set to ${leadDays} day${leadDays === 1 ? "" : "s"}. ${count} queued reminder${count === 1 ? "" : "s"} rescheduled.`,
  };
}

export async function sendNotificationAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("notificationId") ?? "");
  const result = await sendNotification(id);
  refresh();

  return result.ok
    ? { ok: true, message: `Reminder sent to the ${result.audience?.replace("_", " ")}.` }
    : { ok: false, message: result.error ?? "Could not send that reminder." };
}

/**
 * Wipe the transactional tables and re-seed. Demo data only, and the whole
 * point is to be able to run the same walkthrough twice.
 */
export async function resetDemoAction(
  _prev: ActionState | null,
  _formData: FormData,
): Promise<ActionState> {
  if (!dbConfigured()) {
    return {
      ok: false,
      message: "No database attached, so there is nothing to reset. Restart the dev server instead.",
    };
  }

  try {
    await resetToSeed();
    refresh();
    return { ok: true, message: "Demo data restored. Every order, invoice and reminder is back to its seeded state." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not reset the demo data.",
    };
  }
}
