import Link from "next/link";
import { cn } from "@/lib/format";

/** The lengths people actually ask for, in hours. */
const PRESETS: { label: string; hours: number }[] = [
  { label: "4 hours", hours: 4 },
  { label: "1 day", hours: 24 },
  { label: "3 days", hours: 72 },
  { label: "1 week", hours: 168 },
  { label: "2 weeks", hours: 336 },
  { label: "1 month", hours: 720 },
];

/**
 * Tenure lives in the URL rather than client state, so a priced window can be
 * shared, reloaded or linked to from a quote, and the page stays server
 * rendered. Each preset keeps the chosen pickup time and moves the return.
 */
export function TenurePicker({
  basePath,
  startsAt,
  endsAt,
  extraParams,
}: {
  basePath: string;
  startsAt: string;
  endsAt: string;
  extraParams?: Record<string, string>;
}) {
  const currentHours = Math.max(
    1,
    Math.round((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 3_600_000),
  );

  function hrefFor(hours: number): string {
    const to = new Date(new Date(startsAt).getTime() + hours * 3_600_000).toISOString();
    const search = new URLSearchParams({ from: startsAt, to, ...extraParams });
    return `${basePath}?${search.toString()}`;
  }

  return (
    <div>
      <p className="text-sm font-medium text-ink">Hire length</p>
      <div role="group" aria-label="Hire length" className="mt-2 flex flex-wrap gap-2">
        {PRESETS.map((preset) => {
          const active = currentHours === preset.hours;
          return (
            <Link
              key={preset.hours}
              href={hrefFor(preset.hours)}
              scroll={false}
              aria-current={active ? "true" : undefined}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "border-clay bg-clay text-on-clay"
                  : "border-line-strong text-ink-soft hover:border-clay hover:text-clay",
              )}
            >
              {preset.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
