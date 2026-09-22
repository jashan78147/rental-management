import crypto from "node:crypto";
import Razorpay from "razorpay";

/**
 * Razorpay rather than Stripe, because the money here is in rupees and the
 * payment method people actually reach for is UPI. Test-mode keys need no KYC,
 * so the whole flow is demonstrable; live UPI would need a registered business.
 *
 * Everything degrades the same way the AI layer does: with no keys the desk
 * still records a payment against the invoice, it just does not charge anyone.
 */
export const RAZORPAY_CURRENCY = "INR";

export function paymentsConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

/** The publishable half, safe to hand to the browser. */
export function publishableKey(): string | undefined {
  return process.env.RAZORPAY_KEY_ID;
}

let client: Razorpay | null = null;

export function razorpay(): Razorpay {
  if (!client) {
    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    if (!key_id || !key_secret) {
      throw new Error("Razorpay keys are not configured.");
    }
    client = new Razorpay({ key_id, key_secret });
  }
  return client;
}

/** Razorpay works in the smallest currency unit, so rupees become paise. */
export function toPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function fromPaise(paise: number): number {
  return Math.round(paise) / 100;
}

/**
 * Verify a checkout result came from Razorpay and not from a browser that
 * simply posted a success back to us. The signature is HMAC-SHA256 of
 * "<order_id>|<payment_id>" keyed with the secret.
 */
export function verifyCheckoutSignature(args: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${args.orderId}|${args.paymentId}`)
    .digest("hex");

  return timingSafeEqual(expected, args.signature);
}

/** Verify a webhook body against the webhook secret. */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;

  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return timingSafeEqual(expected, signature);
}

/** Constant-time compare that tolerates length mismatches without throwing. */
function timingSafeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}
