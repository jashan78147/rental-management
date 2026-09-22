"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CalendarBlank } from "@phosphor-icons/react/dist/ssr";
import { useCart } from "@/components/cart-provider";
import { Button } from "@/components/ui";
import { durationLabel, fromLocalInput, toLocalInput } from "@/lib/format";

/**
 * The rental window lives in the URL so a filtered catalog view can be shared
 * or reloaded, and mirrors into the cart so the quotation carries the same dates.
 */
export function WindowPicker({
  startsAt,
  endsAt,
  compact = false,
}: {
  startsAt: string;
  endsAt: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const cart = useCart();

  const [from, setFrom] = useState(() => toLocalInput(startsAt));
  const [to, setTo] = useState(() => toLocalInput(endsAt));
  const [error, setError] = useState("");

  useEffect(() => {
    setFrom(toLocalInput(startsAt));
    setTo(toLocalInput(endsAt));
  }, [startsAt, endsAt]);

  function apply(event: React.FormEvent) {
    event.preventDefault();
    const start = new Date(from);
    const end = new Date(to);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setError("Pick both a pickup and a return time.");
      return;
    }
    if (end <= start) {
      setError("The return time has to be after the pickup time.");
      return;
    }

    setError("");
    cart.setWindow(fromLocalInput(from), fromLocalInput(to));

    const next = new URLSearchParams(params.toString());
    next.set("from", fromLocalInput(from));
    next.set("to", fromLocalInput(to));
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  }

  return (
    <form
      onSubmit={apply}
      className={compact ? "flex flex-wrap items-end gap-3" : "card flex flex-wrap items-end gap-4 p-4"}
    >
      <div className="flex min-w-0 flex-col gap-1.5">
        <label htmlFor="window-from" className="text-sm font-medium text-ink">
          Pickup
        </label>
        <input
          id="window-from"
          name="from"
          type="datetime-local"
          value={from}
          onChange={(event) => setFrom(event.target.value)}
          className="h-10 rounded-lg border border-line-strong bg-raised px-3 text-sm text-ink"
        />
      </div>

      <div className="flex min-w-0 flex-col gap-1.5">
        <label htmlFor="window-to" className="text-sm font-medium text-ink">
          Return
        </label>
        <input
          id="window-to"
          name="to"
          type="datetime-local"
          value={to}
          onChange={(event) => setTo(event.target.value)}
          className="h-10 rounded-lg border border-line-strong bg-raised px-3 text-sm text-ink"
        />
      </div>

      <Button type="submit" variant="secondary">
        <CalendarBlank size={16} weight="bold" aria-hidden="true" />
        Check availability
      </Button>

      <p className="text-sm text-ink-soft">
        {durationLabel(startsAt, endsAt)} of hire
      </p>

      {error ? (
        <p role="alert" className="w-full text-sm text-rust">
          {error}
        </p>
      ) : null}
    </form>
  );
}
