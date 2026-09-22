import { BrandGlyph } from "@/components/brand-mark";

/**
 * Shown while a route segment streams in.
 *
 * The mark pulses rather than spins: a spinner says "something is stuck", a
 * slow breath says "this is on its way". The bar underneath is an indeterminate
 * sweep because we genuinely do not know the progress, and a fake percentage
 * would be a lie.
 */
export function RouteLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[60svh] flex-col items-center justify-center gap-5 px-6"
    >
      <span
        aria-hidden="true"
        className="animate-breathe grid h-14 w-14 place-items-center rounded-2xl bg-clay text-on-clay"
      >
        <BrandGlyph className="h-8 w-8" />
      </span>

      <span className="h-1 w-40 overflow-hidden rounded-full bg-sunken">
        <span className="animate-sweep block h-full w-1/3 rounded-full bg-clay" />
      </span>

      <span className="text-sm text-ink-faint">{label}…</span>
    </div>
  );
}

/** Card-shaped placeholders that match what is about to arrive. */
export function CardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="card flex items-center gap-4 p-4">
          <span className="animate-pulse h-12 w-12 shrink-0 rounded-lg bg-sunken" />
          <span className="min-w-0 flex-1 space-y-2">
            <span className="animate-pulse block h-3 w-1/3 rounded bg-sunken" />
            <span className="animate-pulse block h-3 w-2/3 rounded bg-sunken" />
          </span>
        </div>
      ))}
    </div>
  );
}
