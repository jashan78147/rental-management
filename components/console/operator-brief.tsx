import { Sparkle } from "@phosphor-icons/react/dist/ssr";
import { operatorBrief } from "@/lib/ai/brief";
import type { PeriodKey } from "@/lib/domain/reports";
import type { Dataset } from "@/lib/data/store";
import { Badge, Card } from "@/components/ui";
import { cn } from "@/lib/format";

const SEVERITY = {
  urgent: { tone: "rust" as const, label: "Act today" },
  watch: { tone: "ochre" as const, label: "Watch" },
  opportunity: { tone: "pine" as const, label: "Chase" },
};

export async function OperatorBrief({ store, period }: { store: Dataset; period: PeriodKey }) {
  const brief = await operatorBrief(store, period);

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3.5">
        <Sparkle size={17} weight="fill" className="text-clay" aria-hidden="true" />
        <h2 className="font-display font-semibold">Today&rsquo;s brief</h2>
        <Badge tone={brief.source === "claude" ? "clay" : "neutral"} className="ml-auto">
          {brief.source === "claude" ? "Written by Claude" : "Rule based"}
        </Badge>
      </div>

      <p className="px-5 py-4 text-[0.95rem] text-ink">{brief.summary}</p>

      {brief.items.length > 0 ? (
        <ul className="divide-y divide-line border-t border-line">
          {brief.items.map((item, index) => {
            const severity = SEVERITY[item.severity];
            return (
              <li key={`${item.headline}-${index}`} className="flex gap-4 px-5 py-4">
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                    item.severity === "urgent"
                      ? "bg-rust"
                      : item.severity === "watch"
                        ? "bg-ochre"
                        : "bg-pine",
                  )}
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium text-ink">{item.headline}</h3>
                    <Badge tone={severity.tone}>{severity.label}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-ink-soft">{item.detail}</p>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      {brief.note ? (
        <p className="border-t border-line px-5 py-2.5 text-xs text-ink-faint">{brief.note}</p>
      ) : null}
    </Card>
  );
}

export function OperatorBriefSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="h-0.5 w-full overflow-hidden bg-sunken">
        <div className="animate-sweep h-full w-1/3 bg-clay" />
      </div>
      <div className="flex items-center gap-2 border-b border-line px-5 py-3.5">
        <Sparkle size={17} weight="fill" className="text-clay" aria-hidden="true" />
        <h2 className="font-display font-semibold">Today&rsquo;s brief</h2>
        <span className="ml-auto text-xs text-ink-faint">Reading the desk…</span>
      </div>
      <div className="space-y-3 p-5">
        <div className="h-3 w-4/5 rounded bg-sunken" />
        <div className="h-3 w-3/5 rounded bg-sunken" />
        <div className="h-3 w-2/3 rounded bg-sunken" />
      </div>
    </Card>
  );
}
