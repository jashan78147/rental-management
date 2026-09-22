"use client";

import Link from "next/link";
import { ProductThumb } from "@/components/product-thumb";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Sparkle, Trash, Warning } from "@phosphor-icons/react/dist/ssr";
import { useCart } from "@/components/cart-provider";
import { WindowPicker } from "@/components/shop/window-picker";
import { Badge, Button, Card, EmptyState, Field, inputClass } from "@/components/ui";
import type { RecommendationResult } from "@/lib/ai/recommend";
import { SEGMENT_LABEL } from "@/lib/data/seed";
import type { Quote } from "@/lib/domain/quote";
import { UNIT_LABEL } from "@/lib/domain/pricing";
import type { CustomerSegment } from "@/lib/domain/types";
import { cn, durationLabel, fmtDateTime, money } from "@/lib/format";

export interface CartPerson {
  id: string;
  name: string;
  segment: CustomerSegment;
}

export interface CartViewer extends CartPerson {
  email: string;
  isOperator: boolean;
}

export function CartView({
  viewer,
  customers,
}: {
  /** Null when nobody is signed in: the quotation can be priced, not sent. */
  viewer: CartViewer | null;
  /** Only populated for the desk, which raises quotations for other people. */
  customers: CartPerson[];
}) {
  const cart = useCart();
  const router = useRouter();

  // A customer bills to themselves, full stop. Only the desk gets a choice,
  // and the server re-checks it either way.
  const [deskCustomerId, setDeskCustomerId] = useState(customers[0]?.id ?? "");
  const customerId = viewer ? (viewer.isOperator ? deskCustomerId : viewer.id) : "";
  const [notes, setNotes] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [recs, setRecs] = useState<RecommendationResult | null>(null);
  const [pricedKey, setPricedKey] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Everything the price depends on. The displayed quote carries the key it
  // was priced for, so "still pricing" is derived from a mismatch rather than
  // held as its own flag, and a response from a superseded request cannot
  // overwrite a newer one.
  const requestKey = [
    JSON.stringify(cart.items),
    cart.startsAt,
    cart.endsAt,
    customerId,
  ].join("|");
  const pricing = cart.items.length > 0 && pricedKey !== requestKey;

  useEffect(() => {
    if (!cart.ready || cart.items.length === 0) return;

    let live = true;
    void (async () => {
      try {
        const response = await fetch("/api/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: cart.items,
            startsAt: cart.startsAt,
            endsAt: cart.endsAt,
            customerId,
          }),
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error ?? "Could not price this quotation.");
        }

        const priced = (await response.json()) as Quote;
        if (!live) return;
        setQuote(priced);
        setError("");
      } catch (caught) {
        if (!live) return;
        setError(caught instanceof Error ? caught.message : "Could not price this quotation.");
      } finally {
        if (live) setPricedKey(requestKey);
      }
    })();

    return () => {
      live = false;
    };
    // cart.items is covered by requestKey, which ignores identical array instances.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey, cart.ready, cart.items.length]);

  useEffect(() => {
    if (!cart.ready || cart.items.length === 0) return;

    let live = true;
    void (async () => {
      try {
        const response = await fetch("/api/ai/recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productIds: cart.items.map((i) => i.productId),
            startsAt: cart.startsAt,
            endsAt: cart.endsAt,
          }),
        });
        if (!response.ok) return;
        const data = (await response.json()) as RecommendationResult;
        if (live) setRecs(data);
      } catch {
        // The quotation still works without the suggestion panel.
      }
    })();

    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey, cart.ready, cart.items.length]);

  async function submit() {
    if (!quote || quote.blocked || !viewer) return;
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.items,
          startsAt: cart.startsAt,
          endsAt: cart.endsAt,
          customerId: viewer.isOperator ? customerId : undefined,
          notes: notes.trim() || undefined,
        }),
      });

      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not raise the quotation.");

      cart.clear();
      router.push(`/portal/orders/${body.order.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not raise the quotation.");
      setSubmitting(false);
    }
  }

  if (!cart.ready) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="h-6 w-40 animate-pulse rounded bg-sunken" />
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
        <EmptyState
          title="No items on this quotation yet"
          body="Add equipment from the catalog, or describe the job on the home page and let the kit builder assemble it."
          action={
            <div className="mt-2 flex gap-3">
              <Link
                href="/catalog"
                className="inline-flex h-10 items-center rounded-lg bg-clay px-4 font-medium text-on-clay"
              >
                Browse the catalog
              </Link>
              <Link
                href="/"
                className="inline-flex h-10 items-center rounded-lg border border-line-strong px-4 font-medium"
              >
                Describe the job
              </Link>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">Quotation</h1>
        <p className="mt-2 text-ink-soft">
          {durationLabel(cart.startsAt, cart.endsAt)} of hire, {fmtDateTime(cart.startsAt)} to{" "}
          {fmtDateTime(cart.endsAt)}.
        </p>
      </header>

      <WindowPicker startsAt={cart.startsAt} endsAt={cart.endsAt} />

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr] lg:items-start">
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <ul className="divide-y divide-line">
              {(quote?.lines ?? []).map((line) => (
                <li key={line.productId} className="p-4">
                  <div className="flex gap-4">
                    <ProductThumb productId={line.productId} size="lg" />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs uppercase tracking-wider text-ink-faint">
                            {line.category}
                          </p>
                          <Link
                            href={`/catalog/${line.slug}`}
                            className="font-medium text-ink transition-colors hover:text-clay"
                          >
                            {line.name}
                          </Link>
                        </div>
                        <p className="tnum font-display text-lg font-semibold">
                          {money(line.net)}
                        </p>
                      </div>

                      <p className="tnum mt-1 text-sm text-ink-soft">
                        {line.chunks
                          .map(
                            (c) =>
                              `${c.qty} ${UNIT_LABEL[c.unit]}${c.qty > 1 ? "s" : ""} at ${money(c.unitPrice)}`,
                          )
                          .join(" plus ")}
                        {line.quantity > 1 ? ` , times ${line.quantity} units` : ""}
                      </p>

                      {line.discount > 0 ? (
                        <p className="mt-1 text-sm text-pine">
                          {money(line.discount)} off from the applied pricelist.
                        </p>
                      ) : null}

                      {line.shortBy > 0 ? (
                        <div className="mt-2 rounded-lg bg-rust-tint px-3 py-2 text-sm text-rust">
                          <p className="flex items-center gap-1.5 font-medium">
                            <Warning size={15} weight="fill" aria-hidden="true" />
                            Only {line.available} free for these dates, {line.quantity} requested.
                          </p>
                          {line.alternative ? (
                            <p className="mt-1">
                              The same length is free from {fmtDateTime(line.alternative.startsAt)}.
                            </p>
                          ) : null}
                        </div>
                      ) : null}

                      <div className="mt-3 flex items-center gap-3">
                        <div className="flex h-9 items-center rounded-lg border border-line-strong">
                          <button
                            type="button"
                            onClick={() => cart.setQuantity(line.productId, line.quantity - 1)}
                            aria-label={`Reduce ${line.name} quantity`}
                            className="grid h-full w-8 place-items-center text-ink-soft hover:text-clay"
                          >
                            &minus;
                          </button>
                          <span className="tnum w-8 text-center text-sm font-medium">
                            {line.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => cart.setQuantity(line.productId, line.quantity + 1)}
                            aria-label={`Increase ${line.name} quantity`}
                            className="grid h-full w-8 place-items-center text-ink-soft hover:text-clay"
                          >
                            +
                          </button>
                        </div>
                        <span className="tnum text-sm text-ink-faint">
                          {line.available} free
                        </span>
                        <button
                          type="button"
                          onClick={() => cart.remove(line.productId)}
                          className="ml-auto inline-flex items-center gap-1.5 text-sm text-ink-faint transition-colors hover:text-rust"
                        >
                          <Trash size={15} weight="bold" aria-hidden="true" />
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          {/* AI suggestions ------------------------------------------------ */}
          {recs && recs.suggestions.length > 0 ? (
            <Card className="overflow-hidden">
              <div className="flex items-center gap-2 border-b border-line px-4 py-3">
                <Sparkle size={17} weight="fill" className="text-clay" aria-hidden="true" />
                <h2 className="font-display font-semibold">Worth adding before you send this</h2>
                <Badge tone={recs.source === "claude" ? "clay" : "neutral"} className="ml-auto">
                  {recs.source === "claude" ? "Claude" : "Booking history"}
                </Badge>
              </div>

              <ul className="divide-y divide-line">
                {recs.suggestions.map((suggestion) => (
                  <li key={suggestion.productId} className="flex items-center gap-4 p-4">
                    <ProductThumb productId={suggestion.productId} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <Link
                          href={`/catalog/${suggestion.slug}`}
                          className="font-medium text-ink transition-colors hover:text-clay"
                        >
                          {suggestion.name}
                        </Link>
                        <span
                          className={cn(
                            "text-xs",
                            suggestion.confidence === "high" ? "text-pine" : "text-ink-faint",
                          )}
                        >
                          {suggestion.available} free
                        </span>
                      </div>
                      <p className="mt-0.5 text-sm text-ink-soft">{suggestion.reason}</p>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => cart.add(suggestion.productId, 1)}
                    >
                      Add
                    </Button>
                  </li>
                ))}
              </ul>

              {recs.note ? (
                <p className="border-t border-line px-4 py-2.5 text-xs text-ink-faint">
                  {recs.note}
                </p>
              ) : null}
            </Card>
          ) : null}
        </div>

        {/* Summary --------------------------------------------------------- */}
        <div className="space-y-4 lg:sticky lg:top-24">
          <Card className="p-5">
            {viewer === null ? (
              <div>
                <h2 className="font-display font-semibold">Billing to</h2>
                <p className="mt-1.5 text-sm text-ink-soft">
                  Sign in to send this quotation. The prices below are our retail rates;
                  signing in applies whatever rate card your account is on.
                </p>
                <Link
                  href="/login?next=/cart"
                  className="mt-3 inline-flex h-10 items-center rounded-lg bg-clay px-4 text-sm font-medium text-on-clay transition-[transform,background-color] duration-150 ease-[var(--ease-out)] hover:bg-clay-hover active:scale-[0.98]"
                >
                  Sign in to continue
                </Link>
              </div>
            ) : viewer.isOperator ? (
              <Field
                label="Billing to"
                htmlFor="customer"
                hint="Pricelist follows the customer segment."
              >
                <select
                  id="customer"
                  name="customer"
                  value={deskCustomerId}
                  onChange={(event) => setDeskCustomerId(event.target.value)}
                  className={inputClass}
                  style={{ backgroundColor: "var(--paper-raised)", color: "var(--ink)" }}
                >
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} ({SEGMENT_LABEL[customer.segment]})
                    </option>
                  ))}
                </select>
              </Field>
            ) : (
              <div>
                <h2 className="font-display font-semibold">Billing to</h2>
                <p className="mt-1.5 text-sm font-medium text-ink">{viewer.name}</p>
                <p className="text-sm text-ink-soft">{viewer.email}</p>
                <Badge tone="clay" className="mt-2">
                  {SEGMENT_LABEL[viewer.segment]} rates
                </Badge>
              </div>
            )}

            {quote ? (
              <p className="mt-3 text-sm text-ink-soft">
                Priced on <span className="font-medium text-ink">{quote.pricelistName}</span>.
              </p>
            ) : null}

            <div className="mt-5">
              <Field label="Notes for the desk" htmlFor="notes">
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Load-in time, site contact, anything the crew should know…"
                  className="w-full rounded-lg border border-line-strong bg-raised px-3 py-2 text-sm text-ink placeholder:text-ink-faint"
                />
              </Field>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="font-display text-lg font-semibold">Summary</h2>

            <dl className="tnum mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-soft">Rental charge</dt>
                <dd>{money(quote?.subtotal ?? 0)}</dd>
              </div>
              {quote && quote.discountTotal > 0 ? (
                <div className="flex justify-between text-pine">
                  <dt>Pricelist discount</dt>
                  <dd>&minus;{money(quote.discountTotal)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between">
                <dt className="text-ink-soft">GST at {quote?.taxPercent ?? 18}%</dt>
                <dd>{money(quote?.taxTotal ?? 0)}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-2 font-display text-lg font-semibold">
                <dt>Total</dt>
                <dd>{money(quote?.total ?? 0)}</dd>
              </div>
              <div className="flex justify-between text-ink-faint">
                <dt>Refundable deposit</dt>
                <dd>{money(quote?.depositTotal ?? 0)}</dd>
              </div>
            </dl>

            {quote && quote.savingVsDayRate > 0 ? (
              <p className="mt-4 rounded-lg bg-pine-tint px-3 py-2 text-sm text-pine">
                {money(quote.savingVsDayRate)} saved against flat day-rate billing, because longer
                blocks roll up into week and month rates automatically.
              </p>
            ) : null}

            {error ? (
              <p role="alert" className="mt-4 rounded-lg bg-rust-tint px-3 py-2 text-sm text-rust">
                {error}
              </p>
            ) : null}

            {quote?.blocked ? (
              <p className="mt-4 rounded-lg bg-rust-tint px-3 py-2 text-sm text-rust">
                Adjust the flagged quantities or shift the dates before sending this.
              </p>
            ) : null}

            {viewer === null ? (
              <Link
                href="/login?next=/cart"
                className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-clay px-4 font-medium text-on-clay transition-[transform,background-color] duration-150 ease-[var(--ease-out)] hover:bg-clay-hover active:scale-[0.98]"
              >
                Sign in to send this quotation
                <ArrowRight size={17} weight="bold" aria-hidden="true" />
              </Link>
            ) : (
              <Button
                type="button"
                size="lg"
                className="mt-5 w-full"
                disabled={submitting || pricing || !quote || quote.blocked}
                onClick={submit}
              >
                {submitting ? "Raising the quotation…" : "Send quotation"}
                {!submitting ? <ArrowRight size={17} weight="bold" aria-hidden="true" /> : null}
              </Button>
            )}

            <p className="mt-3 text-xs text-ink-faint">
              This raises a draft quotation on{" "}
              {viewer && !viewer.isOperator ? "your portal" : "the customer\u2019s portal"}. Stock
              is only reserved once it is confirmed.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
