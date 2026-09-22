"use client";

import { useMemo, useState } from "react";
import { cheapestChunks, UNIT_LABEL } from "@/lib/domain/pricing";
import type { DurationUnit, PricelistRule } from "@/lib/domain/types";
import { cn, money } from "@/lib/format";

export interface LadderProduct {
  id: string;
  name: string;
  rates: Partial<Record<DurationUnit, number>>;
}

/** Hour marks the slider snaps to, from four hours up to a full month. */
const STOPS = [4, 8, 12, 24, 48, 72, 96, 120, 168, 240, 336, 504, 720];

function asRules(rates: Partial<Record<DurationUnit, number>>) {
  const out: Partial<Record<DurationUnit, PricelistRule>> = {};
  for (const [unit, price] of Object.entries(rates) as [DurationUnit, number][]) {
    out[unit] = {
      id: `demo-${unit}`,
      pricelistId: "demo",
      unit,
      minQty: 1,
      price,
      discountPercent: 0,
      discountFixed: 0,
    };
  }
  return out;
}

function hoursLabel(hours: number): string {
  if (hours < 24) return `${hours} hours`;
  if (hours < 168) return `${Math.round(hours / 24)} days`;
  if (hours < 720) return `${Math.round(hours / 168)} weeks`;
  return `${Math.round(hours / 720)} month`;
}

export function RateLadder({ products }: { products: LadderProduct[] }) {
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  // Opens on ten days, where the week rate visibly beats ten day rates.
  const [stopIndex, setStopIndex] = useState(9);

  const product = products.find((p) => p.id === productId) ?? products[0];
  const hours = STOPS[stopIndex];

  const { chunks, total, flat, saved } = useMemo(() => {
    const rules = asRules(product.rates);
    const computed = cheapestChunks(hours, rules);
    const sum = computed.reduce((acc, c) => acc + c.subtotal, 0);
    const dayRate = product.rates.day ?? 0;
    const flatTotal = Math.ceil(hours / 24) * dayRate;
    return {
      chunks: computed,
      total: sum,
      flat: flatTotal,
      saved: Math.max(0, flatTotal - sum),
    };
  }, [product, hours]);

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-line p-4">
        {products.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setProductId(option.id)}
            aria-pressed={option.id === product.id}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              option.id === product.id
                ? "bg-clay text-on-clay"
                : "border border-line text-ink-soft hover:border-clay hover:text-clay",
            )}
          >
            {option.name}
          </button>
        ))}
      </div>

      <div className="grid gap-8 p-5 sm:p-6 md:grid-cols-[1.1fr_1fr]">
        <div>
          <label htmlFor="ladder-duration" className="text-sm font-medium text-ink">
            Rental length
          </label>
          <p className="tnum mt-1 font-display text-3xl font-semibold text-ink">
            {hoursLabel(hours)}
          </p>
          <input
            id="ladder-duration"
            type="range"
            min={0}
            max={STOPS.length - 1}
            step={1}
            value={stopIndex}
            onChange={(event) => setStopIndex(Number(event.target.value))}
            className="mt-5 h-2 w-full cursor-pointer appearance-none rounded-full bg-sunken accent-[var(--clay)]"
          />
          <div className="mt-2 flex justify-between text-xs text-ink-faint">
            <span>4 hours</span>
            <span>1 month</span>
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-3">
            {(Object.entries(product.rates) as [DurationUnit, number][]).map(([unit, price]) => (
              <div key={unit} className="rounded-lg border border-line px-3 py-2">
                <dt className="text-xs uppercase tracking-wider text-ink-faint">
                  Per {UNIT_LABEL[unit]}
                </dt>
                <dd className="tnum mt-0.5 font-medium text-ink">{money(price)}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="flex flex-col justify-between rounded-xl bg-sunken p-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-ink-faint">
              How this bills
            </p>
            <ul className="mt-3 space-y-2">
              {chunks.map((chunk) => (
                <li
                  key={chunk.unit}
                  className="flex items-baseline justify-between gap-4 text-[0.95rem]"
                >
                  <span className="text-ink">
                    {chunk.qty} {UNIT_LABEL[chunk.unit]}
                    {chunk.qty > 1 ? "s" : ""} at {money(chunk.unitPrice)}
                  </span>
                  <span className="tnum font-medium text-ink">{money(chunk.subtotal)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 border-t border-line-strong pt-4">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-ink-soft">Rental charge</span>
              <span className="tnum font-display text-2xl font-semibold text-ink">
                {money(total)}
              </span>
            </div>
            {saved > 0 ? (
              <p className="mt-2 text-sm text-pine">
                {money(saved)} less than billing {Math.ceil(hours / 24)} days at the day rate of{" "}
                {money(flat)}.
              </p>
            ) : (
              <p className="mt-2 text-sm text-ink-faint">
                Short hire, so the day rate is already the cheapest way to bill it.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
