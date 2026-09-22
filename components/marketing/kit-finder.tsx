"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowRight, Plus, Sparkle, Warning } from "@phosphor-icons/react/dist/ssr";
import { useCart } from "@/components/cart-provider";
import { Badge, Button, Card } from "@/components/ui";
import type { SearchResult } from "@/lib/ai/search";
import { cn } from "@/lib/format";

const EXAMPLES = [
  "Three day outdoor shoot near Lonavala, two camera crew, no mains power",
  "Reception for 300 guests, stage plus lounge seating, one night",
  "Week long documentary block, sync sound, travelling between towns",
];

export function KitFinder() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string>("");
  const cart = useCart();
  const inputRef = useRef<HTMLInputElement>(null);

  async function run(text: string) {
    if (text.trim().length < 3) return;
    setStatus("loading");
    setError("");

    try {
      const response = await fetch("/api/ai/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text, startsAt: cart.startsAt, endsAt: cart.endsAt }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "The kit builder could not be reached.");
      }

      setResult((await response.json()) as SearchResult);
      setStatus("idle");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Try again.");
      setStatus("error");
    }
  }

  function addAll() {
    if (!result) return;
    for (const pick of result.picks) cart.add(pick.productId, pick.quantity);
  }

  const busy = status === "loading";

  return (
    <div className="mx-auto w-full max-w-4xl">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void run(query);
        }}
        className="card flex flex-col gap-3 p-3 sm:flex-row sm:items-center"
      >
        <label htmlFor="kit-finder" className="sr-only">
          Describe the job you need equipment for
        </label>
        <div className="flex flex-1 items-center gap-3 px-2">
          <Sparkle size={20} weight="fill" className="shrink-0 text-clay" aria-hidden="true" />
          <input
            ref={inputRef}
            id="kit-finder"
            name="brief"
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Two day product shoot in a small studio, one presenter…"
            autoComplete="off"
            spellCheck={false}
            className="h-11 min-w-0 flex-1 bg-transparent text-[0.95rem] text-ink outline-none placeholder:text-ink-faint"
          />
        </div>
        <Button type="submit" size="lg" disabled={busy || query.trim().length < 3}>
          {busy ? "Building the kit…" : "Build my kit"}
        </Button>
      </form>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-ink-faint">Try</span>
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => {
              setQuery(example);
              inputRef.current?.focus();
              void run(example);
            }}
            className="rounded-full border border-line px-3 py-1 text-xs text-ink-soft transition-colors hover:border-clay hover:text-clay"
          >
            {example.length > 46 ? `${example.slice(0, 46)}…` : example}
          </button>
        ))}
      </div>

      <div aria-live="polite" className="mt-6">
        {status === "error" ? (
          <Card className="flex items-start gap-3 border-rust/30 bg-rust-tint p-4 text-sm text-rust">
            <Warning size={18} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" />
            <p>{error}</p>
          </Card>
        ) : null}

        {busy ? (
          <Card className="overflow-hidden p-0">
            <div className="h-0.5 w-full overflow-hidden bg-sunken">
              <div className="animate-sweep h-full w-1/3 bg-clay" />
            </div>
            <div className="space-y-3 p-5">
              {[0, 1, 2].map((row) => (
                <div key={row} className="flex items-center gap-3">
                  <div className="h-12 w-12 shrink-0 rounded-lg bg-sunken" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-3 w-1/3 rounded bg-sunken" />
                    <div className="h-3 w-2/3 rounded bg-sunken" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ) : null}

        {result && !busy ? (
          <Card className="animate-rise overflow-hidden">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line p-5">
              <div className="min-w-0">
                <Badge
                  tone={
                    result.source === "claude"
                      ? "clay"
                      : result.source === "rules"
                        ? "pine"
                        : "neutral"
                  }
                >
                  {result.source === "claude"
                    ? "Read by Claude"
                    : result.source === "rules"
                      ? "Kit rules"
                      : "Keyword match"}
                </Badge>
                <p className="mt-2 text-[0.95rem] text-ink">{result.understood}</p>
                {result.suggestedDurationHours ? (
                  <p className="mt-1 text-sm text-ink-soft">
                    Sized for roughly{" "}
                    <span className="tnum font-medium text-ink">
                      {result.suggestedDurationHours < 48
                        ? `${result.suggestedDurationHours} hours`
                        : `${Math.round(result.suggestedDurationHours / 24)} days`}
                    </span>
                    .
                  </p>
                ) : null}
              </div>
              {result.picks.length > 0 ? (
                <Button type="button" onClick={addAll} variant="secondary">
                  Add {result.picks.length} items to quote
                </Button>
              ) : null}
            </div>

            {result.picks.length === 0 ? (
              <p className="p-5 text-sm text-ink-soft">
                Nothing in the catalog matched that closely enough to suggest. Try naming the kind
                of job, the rough size and whether you have power on site.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {result.picks.map((pick) => (
                  <li key={pick.productId} className="flex items-center gap-4 p-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={pick.imageUrl}
                      alt=""
                      width={56}
                      height={56}
                      loading="lazy"
                      className="h-14 w-14 shrink-0 rounded-lg object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <Link
                          href={`/catalog/${pick.slug}`}
                          className="font-medium text-ink transition-colors hover:text-clay"
                        >
                          {pick.name}
                        </Link>
                        <span className="tnum text-sm text-ink-faint">
                          {pick.quantity} of {pick.available} free
                        </span>
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-sm text-ink-soft">{pick.why}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => cart.add(pick.productId, pick.quantity)}
                      aria-label={`Add ${pick.name} to the quotation`}
                      className={cn(
                        "grid h-9 w-9 shrink-0 place-items-center rounded-lg border transition-colors",
                        cart.has(pick.productId)
                          ? "border-pine/40 bg-pine-tint text-pine"
                          : "border-line text-ink-soft hover:border-clay hover:text-clay",
                      )}
                    >
                      <Plus size={16} weight="bold" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {result.missing.length > 0 ? (
              <div className="border-t border-line bg-sunken p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-ink-faint">
                  Still needed to firm this up
                </p>
                <ul className="mt-2 space-y-1">
                  {result.missing.map((item) => (
                    <li key={item} className="text-sm text-ink-soft">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {result.note ? (
              <p className="border-t border-line px-4 py-2.5 text-xs text-ink-faint">
                {result.note}
              </p>
            ) : null}

            {result.picks.length > 0 ? (
              <div className="border-t border-line p-4">
                <Link
                  href="/cart"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-clay transition-colors hover:text-clay-hover"
                >
                  Review the quotation
                  <ArrowRight size={15} weight="bold" aria-hidden="true" />
                </Link>
              </div>
            ) : null}
          </Card>
        ) : null}
      </div>
    </div>
  );
}
