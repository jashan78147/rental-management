import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { lateFeeRules, profileById } from "@/lib/data/store";
import type { Dataset } from "@/lib/data/store";
import { returnRisk } from "@/lib/domain/fees";
import { categoryMix, headline, topCustomers, topProducts, type PeriodKey } from "@/lib/domain/reports";
import { money } from "@/lib/format";
import { AI_MODEL, aiClient, aiConfigured, describeAiError } from "./client";

export interface BriefItem {
  headline: string;
  detail: string;
  severity: "urgent" | "watch" | "opportunity";
}

export interface BriefResult {
  summary: string;
  items: BriefItem[];
  source: "claude" | "rules";
  note?: string;
}

const BriefSchema = z.object({
  summary: z.string(),
  items: z
    .array(
      z.object({
        headline: z.string(),
        detail: z.string(),
        severity: z.enum(["urgent", "watch", "opportunity"]),
      }),
    )
    .max(4),
});

const SYSTEM = `You write the morning brief for the person running a rental desk.

You get this period's numbers, the overdue and due-soon list, the top products and the top customers. Write a two-sentence summary and up to four items, each one something the reader can act on before lunch.

Rules:
- Lead with what is at risk today, then what is worth chasing.
- Every item names a real reference, product or customer from the data. Never invent one.
- "detail" is one or two sentences and says what to do, not just what happened.
- Numbers you quote must come from the data given. Do not estimate or round in a way that changes them.
- Plain working English. No filler verbs, no marketing language, no exclamation marks.`;

function rulesBrief(store: Dataset, period: PeriodKey): BriefResult {
  const stats = headline(store, period);
  const risks = returnRisk(store.orders, lateFeeRules, store.products);
  const overdue = risks.filter((r) => r.risk === "overdue");
  const dueSoon = risks.filter((r) => r.risk === "due_soon");
  const products = topProducts(store, period, 3);
  const quotes = store.orders.filter((o) => o.status === "quotation_sent");

  const items: BriefItem[] = [];

  if (overdue.length > 0) {
    const worst = overdue[0];
    items.push({
      headline: `${overdue.length} rental${overdue.length > 1 ? "s" : ""} overdue`,
      detail: `${worst.reference} is ${Math.abs(Math.round(worst.hoursRemaining))} hours past due with ${money(worst.projectedFee)} in late fees accrued. Call the customer and book a collection slot.`,
      severity: "urgent",
    });
  }

  if (dueSoon.length > 0) {
    items.push({
      headline: `${dueSoon.length} returning within 48 hours`,
      detail: `Confirm the collection runs for ${dueSoon.slice(0, 2).map((r) => r.reference).join(" and ")} so the units are back on the shelf for the next booking.`,
      severity: "watch",
    });
  }

  if (quotes.length > 0) {
    const value = quotes.reduce((sum, o) => sum + o.total, 0);
    items.push({
      headline: `${money(value)} sitting in sent quotations`,
      detail: `${quotes.map((q) => q.reference).join(", ")} have been sent but not confirmed. Chase the oldest one first.`,
      severity: "opportunity",
    });
  }

  if (products.length > 0) {
    items.push({
      headline: `${products[0].name} is your revenue leader`,
      detail: `It brought in ${money(products[0].revenue)} across ${products[0].timesRented} orders this period at ${products[0].utilisation}% utilisation. Consider adding a unit if it keeps blocking bookings.`,
      severity: "opportunity",
    });
  }

  return {
    summary: `${money(stats.revenue)} booked across ${stats.bookedOrders} orders this period, with ${stats.unitsOnHire} units currently out with customers. ${overdue.length} rentals are overdue and ${stats.quotationCount} quotations are still open.`,
    items: items.slice(0, 4),
    source: "rules",
  };
}

export async function operatorBrief(store: Dataset, period: PeriodKey): Promise<BriefResult> {
  if (!aiConfigured()) {
    const brief = rulesBrief(store, period);
    return { ...brief, note: "Set ANTHROPIC_API_KEY to have Claude write this brief." };
  }

  const stats = headline(store, period);
  const risks = returnRisk(store.orders, lateFeeRules, store.products);
  const products = topProducts(store, period, 6);
  const customers = topCustomers(store, period, 5);
  const mix = categoryMix(store, period);
  const quotes = store.orders.filter(
    (o) => o.status === "quotation" || o.status === "quotation_sent",
  );

  const payload = [
    `PERIOD HEADLINE`,
    `revenue: ${stats.revenue}`,
    `booked orders: ${stats.bookedOrders}`,
    `open quotations: ${stats.quotationCount} worth ${stats.quotationValue}`,
    `quote to order conversion: ${stats.conversionRate}%`,
    `units currently out with customers: ${stats.unitsOnHire}`,
    `utilisation of the fleet that moved this period: ${stats.utilisation}% (bulk staging stock drags this down and that is expected, do not treat a low figure as a problem on its own)`,
    `on-time return rate: ${stats.onTimeRate}%`,
    `late fees billed: ${stats.lateFees}`,
    ``,
    `RETURN RISK`,
    ...risks.map(
      (r) =>
        `${r.reference} | ${r.risk} | ${Math.round(r.hoursRemaining)}h remaining | projected fee ${r.projectedFee}`,
    ),
    ``,
    `OPEN QUOTATIONS`,
    ...quotes.map(
      (q) =>
        `${q.reference} | ${profileById(q.customerId)?.fullName} | ${q.status} | ${q.total} | starts ${q.startsAt.slice(0, 10)}`,
    ),
    ``,
    `TOP PRODUCTS`,
    ...products.map(
      (p) => `${p.name} | ${p.timesRented} orders | revenue ${p.revenue} | utilisation ${p.utilisation}%`,
    ),
    ``,
    `TOP CUSTOMERS`,
    ...customers.map(
      (c) => `${c.name} | ${c.segment} | ${c.orders} orders | revenue ${c.revenue} | ${c.lateReturns} late returns`,
    ),
    ``,
    `CATEGORY MIX`,
    ...mix.map((m) => `${m.category} | ${m.revenue} | ${m.share}%`),
  ].join("\n");

  try {
    const response = await aiClient().messages.parse({
      model: AI_MODEL,
      max_tokens: 4000,
      thinking: { type: "adaptive" },
      system: SYSTEM,
      messages: [{ role: "user", content: payload }],
      output_config: { format: zodOutputFormat(BriefSchema) },
    });

    const parsed = response.parsed_output;
    if (!parsed) throw new Error("Model returned no parseable brief.");

    return { summary: parsed.summary, items: parsed.items, source: "claude" };
  } catch (error) {
    const brief = rulesBrief(store, period);
    return { ...brief, note: describeAiError(error) };
  }
}
