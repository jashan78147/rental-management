import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { payInvoice } from "@/lib/data/mutations";
import { fromPaise, verifyWebhookSignature } from "@/lib/payments/razorpay";

export const runtime = "nodejs";

interface RazorpayWebhook {
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        amount?: number;
        notes?: Record<string, string>;
      };
    };
  };
}

/**
 * The durable half of the payment path.
 *
 * The browser callback can be lost, a customer can close the tab, a phone can
 * drop off the network mid-UPI. The webhook fires regardless, so payment state
 * comes from the gateway rather than from whether a page finished loading.
 *
 * The raw body is read as text because the signature is computed over the exact
 * bytes; parsing first and re-serialising would change them and fail the check.
 */
export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";

  if (!verifyWebhookSignature(raw, signature)) {
    // Unsigned or wrongly signed: refuse, and say nothing about why.
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  let body: RazorpayWebhook;
  try {
    body = JSON.parse(raw) as RazorpayWebhook;
  } catch {
    return NextResponse.json({ error: "Malformed payload." }, { status: 400 });
  }

  if (body.event !== "payment.captured" && body.event !== "order.paid") {
    // Acknowledge everything else so the gateway stops retrying it.
    return NextResponse.json({ ignored: body.event ?? "unknown" });
  }

  const entity = body.payload?.payment?.entity;
  const invoiceId = entity?.notes?.invoiceId;
  const paymentId = entity?.id;

  if (!invoiceId || !paymentId) {
    return NextResponse.json({ ignored: "no invoice reference on the payment" });
  }

  const result = await payInvoice(invoiceId, paymentId);

  // An invoice already settled by the browser callback is a success, not an
  // error; returning 200 stops the gateway retrying a payment we have.
  if (!result.ok) {
    return NextResponse.json({ ok: true, note: result.error });
  }

  revalidatePath("/portal");
  revalidatePath("/portal/invoices");
  revalidatePath("/console/invoices");
  if (result.order) {
    revalidatePath(`/portal/orders/${result.order.id}`);
    revalidatePath(`/console/orders/${result.order.id}`);
  }

  return NextResponse.json({
    ok: true,
    invoiceId,
    amount: entity?.amount != null ? fromPaise(entity.amount) : undefined,
  });
}
