import type { Metadata } from "next";
import { Badge, Card } from "@/components/ui";
import { categoryById, pricelists, productById } from "@/lib/data/store";
import { UNIT_LABEL } from "@/lib/domain/pricing";
import type { DurationUnit, PricelistRule } from "@/lib/domain/types";
import { fmtDateFull, money } from "@/lib/format";

export const metadata: Metadata = { title: "Pricelists" };

const UNIT_ORDER: DurationUnit[] = ["hour", "day", "week", "month", "year"];

function scopeLabel(rule: PricelistRule): string {
  if (rule.productId) return productById(rule.productId)?.name ?? rule.productId;
  if (rule.categoryId) return `${categoryById(rule.categoryId)?.name ?? rule.categoryId} (category)`;
  return "Whole catalog";
}

function validity(from?: string, to?: string): string {
  if (!from && !to) return "Always active";
  if (from && to) return `${fmtDateFull(from)} to ${fmtDateFull(to)}`;
  if (from) return `From ${fmtDateFull(from)}`;
  return `Until ${fmtDateFull(to!)}`;
}

function status(from?: string, to?: string): { tone: "pine" | "ochre" | "neutral"; label: string } {
  const today = new Date().toISOString().slice(0, 10);
  if (from && today < from) return { tone: "ochre", label: "Upcoming" };
  if (to && today > to) return { tone: "neutral", label: "Expired" };
  return { tone: "pine", label: "Live" };
}

export default function PricelistsPage() {
  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-3xl font-semibold">Pricelists</h1>
        <p className="mt-1 text-ink-soft">
          A quotation picks the most specific active list for the customer&rsquo;s segment, then
          resolves rates per product with product rules beating category rules beating catalog-wide
          ones.
        </p>
      </header>

      <div className="space-y-6">
        {pricelists.map((pricelist) => {
          const state = status(pricelist.validFrom, pricelist.validTo);

          // Collapse the rule set into one row per scope so a 22-product list
          // reads as a rate card rather than 88 near-identical lines.
          const byScope = new Map<string, Partial<Record<DurationUnit, PricelistRule>>>();
          for (const rule of pricelist.rules) {
            const key = rule.productId ?? rule.categoryId ?? "all";
            const row = byScope.get(key) ?? {};
            row[rule.unit] = rule;
            byScope.set(key, row);
          }

          const sample = [...byScope.entries()].slice(0, 6);
          const discountRule = pricelist.rules.find(
            (r) => r.discountPercent > 0 || r.discountFixed > 0,
          );

          return (
            <Card key={pricelist.id} className="overflow-hidden">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-lg font-semibold">{pricelist.name}</h2>
                    <Badge tone={state.tone}>{state.label}</Badge>
                    {pricelist.segment ? (
                      <Badge tone="clay">{pricelist.segment} segment</Badge>
                    ) : (
                      <Badge>All segments</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-ink-soft">
                    {validity(pricelist.validFrom, pricelist.validTo)} , priority{" "}
                    {pricelist.priority} , {pricelist.rules.length} rules
                  </p>
                </div>

                {discountRule ? (
                  <p className="rounded-lg bg-pine-tint px-3 py-1.5 text-sm text-pine">
                    {discountRule.discountPercent > 0
                      ? `${discountRule.discountPercent}% off`
                      : `${money(discountRule.discountFixed)} off`}{" "}
                    where it applies
                  </p>
                ) : null}
              </div>

              <div className="overflow-x-auto scrollbar-slim">
                <table className="w-full min-w-[38rem] text-sm">
                  <caption className="sr-only">{pricelist.name} rate card</caption>
                  <thead>
                    <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-ink-faint">
                      <th scope="col" className="px-5 py-2.5 font-medium">Applies to</th>
                      {UNIT_ORDER.map((unit) => (
                        <th key={unit} scope="col" className="px-4 py-2.5 text-right font-medium">
                          Per {UNIT_LABEL[unit]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {sample.map(([key, row]) => {
                      const firstRule = Object.values(row)[0]!;
                      return (
                        <tr key={key} className="transition-colors hover:bg-sunken">
                          <td className="px-5 py-2.5 text-ink">{scopeLabel(firstRule)}</td>
                          {UNIT_ORDER.map((unit) => (
                            <td key={unit} className="tnum px-4 py-2.5 text-right">
                              {row[unit] ? (
                                row[unit]!.price > 0 ? (
                                  money(row[unit]!.price)
                                ) : (
                                  <span className="text-pine">
                                    &minus;{row[unit]!.discountPercent}%
                                  </span>
                                )
                              ) : (
                                <span className="text-ink-faint">&mdash;</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {byScope.size > sample.length ? (
                <p className="border-t border-line px-5 py-2.5 text-xs text-ink-faint">
                  Showing {sample.length} of {byScope.size} priced scopes.
                </p>
              ) : null}
            </Card>
          );
        })}
      </div>

      <Card className="mt-8 p-5">
        <h2 className="font-display font-semibold">Resolution order</h2>
        <ol className="mt-3 space-y-2 text-sm text-ink-soft">
          <li>
            <span className="font-medium text-ink">Segment first.</span> A list scoped to the
            customer&rsquo;s segment beats a general one, whatever the priority.
          </li>
          <li>
            <span className="font-medium text-ink">Then validity.</span> Lists outside their date
            range are skipped entirely, which is how the seasonal cards switch themselves on.
          </li>
          <li>
            <span className="font-medium text-ink">Then priority.</span> The highest number wins
            among the remaining candidates.
          </li>
          <li>
            <span className="font-medium text-ink">Then specificity, per rate.</span> Inside the
            winning list, a product rule beats a category rule beats a catalog-wide rule.
          </li>
        </ol>
      </Card>
    </div>
  );
}
