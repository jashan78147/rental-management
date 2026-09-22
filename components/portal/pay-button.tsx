"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui";
import { BRAND } from "@/lib/data/seed";
import { money } from "@/lib/format";

/** Minimal shape of the checkout handle Razorpay attaches to the window. */
interface CheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: { name?: string; email?: string; contact?: string };
  notes?: Record<string, string>;
  theme?: { color?: string };
  handler: (response: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => void;
  modal?: { ondismiss?: () => void };
}

declare global {
  interface Window {
    Razorpay?: new (options: CheckoutOptions) => { open: () => void };
  }
}

const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

/** Load the gateway script once, on demand rather than on every page. */
function loadCheckout(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${CHECKOUT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Gateway script blocked.")));
      return;
    }

    const script = document.createElement("script");
    script.src = CHECKOUT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not reach the payment gateway."));
    document.body.appendChild(script);
  });
}

export function PayButton({
  invoiceId,
  amount,
  label,
  size = "sm",
}: {
  invoiceId: string;
  amount: number;
  label?: string;
  size?: "sm" | "md" | "lg";
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "opening" | "verifying" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function pay() {
    setState("opening");
    setMessage("");

    try {
      const orderResponse = await fetch("/api/payments/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId }),
      });

      const order = await orderResponse.json();
      if (!orderResponse.ok) throw new Error(order.error ?? "Could not start the payment.");

      await loadCheckout();
      if (!window.Razorpay) throw new Error("The payment gateway did not load.");

      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: BRAND.name,
        description: `${order.invoiceNumber} for ${order.orderReference}`,
        order_id: order.razorpayOrderId,
        prefill: order.customer,
        notes: { invoiceId },
        theme: { color: "#0e2a47" },
        modal: {
          ondismiss: () => {
            // Closing the sheet is a normal outcome, not a failure.
            setState("idle");
          },
        },
        handler: async (response) => {
          setState("verifying");
          try {
            const verifyResponse = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                invoiceId,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              }),
            });

            const verified = await verifyResponse.json();
            if (!verifyResponse.ok) throw new Error(verified.error ?? "Payment not verified.");

            setState("done");
            setMessage("Payment received.");
            router.refresh();
          } catch (caught) {
            // The money may well have left. Say so rather than implying failure.
            setState("error");
            setMessage(
              caught instanceof Error
                ? `${caught.message} If you were charged, the webhook will settle this shortly.`
                : "Could not confirm the payment.",
            );
          }
        },
      });

      checkout.open();
      setState("idle");
    } catch (caught) {
      setState("error");
      setMessage(caught instanceof Error ? caught.message : "Could not start the payment.");
    }
  }

  if (state === "done") {
    return (
      <p className="inline-flex items-center gap-1.5 text-sm font-medium text-pine">
        <CheckCircle size={15} weight="fill" aria-hidden="true" />
        {message}
      </p>
    );
  }

  return (
    <div className="inline-flex flex-col gap-2">
      <Button
        type="button"
        size={size}
        onClick={pay}
        disabled={state === "opening" || state === "verifying"}
      >
        {state === "opening"
          ? "Opening…"
          : state === "verifying"
            ? "Confirming…"
            : (label ?? `Pay ${money(amount)}`)}
      </Button>

      {state === "error" ? (
        <p
          aria-live="polite"
          className="inline-flex max-w-xs items-start gap-1.5 text-sm text-rust"
        >
          <WarningCircle size={15} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" />
          {message}
        </p>
      ) : null}
    </div>
  );
}
