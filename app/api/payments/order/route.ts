import { NextResponse } from "next/server";
import { z } from "zod";
import { loadDataset } from "@/lib/data/persist";
import { profileById } from "@/lib/data/store";
import {
  RAZORPAY_CURRENCY,
  paymentsConfigured,
  publishableKey,
  razorpay,
  toPaise,
} from "@/lib/payments/razorpay";

export const runtime = "nodejs";

const Body = z.object({ invoiceId: z.string().min(1) });

export async function POST(request: Request) {
  if (!paymentsConfigured()) {
    return NextResponse.json(
      { error: "No payment gateway is configured on this deployment." },
      { status: 503 },
    );
  }

  let parsed;
  try {
    parsed = Body.safeParse(await request.json());
  } catch {
    return NextResponse.json({ error: "Send a JSON body." }, { status: 400 });
  }
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payment request." }, { status: 400 });
  }

  // The amount comes from the stored invoice, never from the browser, so a
  // tampered request cannot pay less than the invoice says.
  const store = await loadDataset();
  const invoice = store.invoices.find((i) => i.id === parsed.data.invoiceId);
  if (!invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  if (invoice.status === "paid") {
    return NextResponse.json({ error: "That invoice is already paid." }, { status: 409 });
  }
  if (invoice.status === "void") {
    return NextResponse.json({ error: "That invoice was voided." }, { status: 409 });
  }

  const order = store.orders.find((o) => o.id === invoice.orderId);
  const customer = order ? profileById(order.customerId) : undefined;

  try {
    const created = await razorpay().orders.create({
      amount: toPaise(invoice.amount),
      currency: RAZORPAY_CURRENCY,
      receipt: invoice.number,
      notes: {
        invoiceId: invoice.id,
        orderReference: order?.reference ?? "",
        kind: invoice.kind,
      },
    });

    return NextResponse.json({
      razorpayOrderId: created.id,
      amount: created.amount,
      currency: created.currency,
      keyId: publishableKey(),
      invoiceNumber: invoice.number,
      orderReference: order?.reference ?? "",
      customer: customer
        ? { name: customer.fullName, email: customer.email, contact: customer.phone ?? "" }
        : undefined,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Could not open a payment with the gateway.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 502 },
    );
  }
}
