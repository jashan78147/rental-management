import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { payInvoice } from "@/lib/data/mutations";
import { paymentsConfigured, verifyCheckoutSignature } from "@/lib/payments/razorpay";

export const runtime = "nodejs";

const Body = z.object({
  invoiceId: z.string().min(1),
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

/**
 * Called by the browser once the checkout modal reports success.
 *
 * The signature is what makes this trustworthy: it is an HMAC of the order and
 * payment ids keyed with our secret, so a browser cannot simply post a success
 * and mark an invoice paid. The webhook is the durable path for cases where the
 * customer closes the tab before this fires; both are idempotent because
 * payInvoice refuses an invoice that is already paid.
 */
export async function POST(request: Request) {
  if (!paymentsConfigured()) {
    return NextResponse.json({ error: "No payment gateway configured." }, { status: 503 });
  }

  let parsed;
  try {
    parsed = Body.safeParse(await request.json());
  } catch {
    return NextResponse.json({ error: "Send a JSON body." }, { status: 400 });
  }
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid verification request." }, { status: 400 });
  }

  const { invoiceId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = parsed.data;

  const genuine = verifyCheckoutSignature({
    orderId: razorpayOrderId,
    paymentId: razorpayPaymentId,
    signature: razorpaySignature,
  });

  if (!genuine) {
    return NextResponse.json(
      { error: "That payment could not be verified against the gateway." },
      { status: 400 },
    );
  }

  const result = await payInvoice(invoiceId, razorpayPaymentId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }

  revalidatePath("/portal");
  revalidatePath("/portal/invoices");
  revalidatePath("/console/invoices");
  if (result.order) {
    revalidatePath(`/portal/orders/${result.order.id}`);
    revalidatePath(`/console/orders/${result.order.id}`);
  }

  return NextResponse.json({ ok: true, paymentId: razorpayPaymentId });
}
