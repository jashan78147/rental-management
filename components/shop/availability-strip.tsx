import Link from "next/link";
import type { DayLoad } from "@/lib/domain/availability";
import { cn } from "@/lib/format";

const WEEKDAY = new Intl.DateTimeFormat("en-IN", { weekday: "narrow" });
const DAY_MONTH = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" });

function tone(load: DayLoad): string {
  if (load.total === 0) return "bg-sunken";
  const used = load.reserved / load.total;
  if (used === 0) return "bg-pine-tint text-pine";
  if (used < 0.5) return "bg-ochre-tint text-ochre";
  if (used < 1) return "bg-clay-tint text-clay";
  return "bg-rust-tint text-rust";
}

/** Three-week occupancy bar for one product, used by the catalog calendar view. */
export function AvailabilityStrip({
  name,
  slug,
  totalUnits,
  load,
}: {
  name: string;
  slug: string;
  totalUnits: number;
  load: DayLoad[];
}) {
  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Link
          href={`/catalog/${slug}`}
          className="font-medium text-ink transition-colors hover:text-clay"
        >
          {name}
        </Link>
        <span className="tnum text-sm text-ink-faint">{totalUnits} units in fleet</span>
      </div>

      <ol className="scrollbar-slim mt-3 flex gap-1 overflow-x-auto pb-1">
        {load.map((day) => {
          const date = new Date(day.date);
          return (
            <li key={day.date} className="shrink-0">
              <div
                title={`${DAY_MONTH.format(date)}: ${day.free} of ${day.total} free`}
                className={cn(
                  "tnum grid h-11 w-11 place-content-center rounded-lg text-center text-xs font-medium",
                  tone(day),
                )}
              >
                <span className="block text-[0.65rem] opacity-70">{WEEKDAY.format(date)}</span>
                <span>{day.free}</span>
              </div>
            </li>
          );
        })}
      </ol>

      {load[0] ? (
        <p className="mt-2 text-xs text-ink-faint">
          Free units per day from {DAY_MONTH.format(new Date(load[0].date))}. Hover a day for the
          exact split.
        </p>
      ) : null}
    </div>
  );
}
