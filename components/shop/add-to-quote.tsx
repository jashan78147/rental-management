"use client";

import { useState } from "react";
import { Check, Plus } from "@phosphor-icons/react/dist/ssr";
import { useCart } from "@/components/cart-provider";
import { Button } from "@/components/ui";
import { cn } from "@/lib/format";

export function AddToQuote({
  productId,
  available,
  size = "md",
  label = "Add to quotation",
}: {
  productId: string;
  available: number;
  size?: "sm" | "md" | "lg";
  label?: string;
}) {
  const cart = useCart();
  const [quantity, setQuantity] = useState(1);
  const inCart = cart.items.find((i) => i.productId === productId);

  if (available <= 0) {
    return (
      <Button type="button" variant="secondary" size={size} disabled>
        Fully booked for these dates
      </Button>
    );
  }

  if (inCart) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex h-10 items-center rounded-lg border border-line-strong">
          <button
            type="button"
            onClick={() => cart.setQuantity(productId, inCart.quantity - 1)}
            aria-label="Reduce quantity"
            className="grid h-full w-9 place-items-center text-ink-soft transition-colors hover:text-clay"
          >
            &minus;
          </button>
          <span className="tnum w-9 text-center text-sm font-medium">{inCart.quantity}</span>
          <button
            type="button"
            onClick={() => cart.setQuantity(productId, inCart.quantity + 1)}
            disabled={inCart.quantity >= available}
            aria-label="Increase quantity"
            className="grid h-full w-9 place-items-center text-ink-soft transition-colors hover:text-clay disabled:opacity-40"
          >
            +
          </button>
        </div>
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-pine">
          <Check size={15} weight="bold" aria-hidden="true" />
          In quotation
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={`qty-${productId}`} className="sr-only">
        Quantity
      </label>
      <input
        id={`qty-${productId}`}
        type="number"
        inputMode="numeric"
        min={1}
        max={available}
        value={quantity}
        onChange={(event) =>
          setQuantity(Math.min(available, Math.max(1, Number(event.target.value) || 1)))
        }
        className="tnum h-10 w-16 rounded-lg border border-line-strong bg-raised px-2 text-center text-sm"
      />
      <Button type="button" size={size} onClick={() => cart.add(productId, quantity)}>
        <Plus size={15} weight="bold" aria-hidden="true" />
        {label}
      </Button>
    </div>
  );
}

export function QuickAdd({ productId, available }: { productId: string; available: number }) {
  const cart = useCart();
  const inCart = cart.has(productId);

  return (
    <button
      type="button"
      disabled={available <= 0}
      onClick={() => cart.add(productId, 1)}
      aria-label={inCart ? "Add another to the quotation" : "Add to the quotation"}
      className={cn(
        "grid h-9 w-9 shrink-0 place-items-center rounded-lg border transition-colors disabled:opacity-40",
        inCart
          ? "border-pine/40 bg-pine-tint text-pine"
          : "border-line text-ink-soft hover:border-clay hover:text-clay",
      )}
    >
      {inCart ? (
        <Check size={16} weight="bold" aria-hidden="true" />
      ) : (
        <Plus size={16} weight="bold" aria-hidden="true" />
      )}
    </button>
  );
}
