import type {
  CustomerSegment,
  DurationUnit,
  LinePricing,
  PriceChunk,
  Pricelist,
  PricelistRule,
  Product,
} from "./types";

export const UNIT_HOURS: Record<DurationUnit, number> = {
  hour: 1,
  day: 24,
  week: 168,
  month: 720,
  year: 8760,
};

export const UNIT_LABEL: Record<DurationUnit, string> = {
  hour: "hour",
  day: "day",
  week: "week",
  month: "month",
  year: "year",
};

const UNITS_DESC: DurationUnit[] = ["year", "month", "week", "day", "hour"];

/** Hours between two ISO timestamps, rounded up to the next whole hour. */
export function durationHours(startsAt: string, endsAt: string): number {
  const ms = new Date(endsAt).getTime() - new Date(startsAt).getTime();
  return Math.max(1, Math.ceil(ms / 3_600_000));
}

/**
 * Pick the pricelist that applies to a customer on a given date.
 * A list scoped to the customer's segment beats a general one; ties break on priority.
 */
export function selectPricelist(
  pricelists: Pricelist[],
  segment: CustomerSegment,
  onDate: Date = new Date(),
): Pricelist | undefined {
  const day = onDate.toISOString().slice(0, 10);
  const eligible = pricelists.filter((pl) => {
    if (!pl.isActive) return false;
    if (pl.segment && pl.segment !== segment) return false;
    if (pl.validFrom && day < pl.validFrom) return false;
    if (pl.validTo && day > pl.validTo) return false;
    return true;
  });

  return eligible.sort((a, b) => {
    const aScoped = a.segment ? 1 : 0;
    const bScoped = b.segment ? 1 : 0;
    if (aScoped !== bScoped) return bScoped - aScoped;
    return b.priority - a.priority;
  })[0];
}

/**
 * Resolve the rate card for one product inside one pricelist.
 * Specificity: a product rule beats a category rule, which beats a catalog-wide rule.
 */
export function resolveRates(
  pricelist: Pricelist,
  product: Product,
): Partial<Record<DurationUnit, PricelistRule>> {
  const scoreOf = (r: PricelistRule) =>
    r.productId === product.id ? 3 : r.categoryId === product.categoryId ? 2 : !r.productId && !r.categoryId ? 1 : 0;

  const out: Partial<Record<DurationUnit, PricelistRule>> = {};
  for (const rule of pricelist.rules) {
    const score = scoreOf(rule);
    if (score === 0) continue;
    const current = out[rule.unit];
    if (!current || scoreOf(current) < score) out[rule.unit] = rule;
  }
  return out;
}

interface Step {
  cost: number;
  unit: DurationUnit | null;
}

const DP_CEILING = 26_280; // three years of hours; beyond that we fall back to greedy

/**
 * Cheapest way to cover `hours` using the available rate card.
 *
 * Renting 10 days where the rate card has a day and a week rate should bill
 * 1 week + 3 days when that beats 10 days, and the customer should never pay
 * more than the plain per-unit arithmetic. A small DP over the hour axis gives
 * the true optimum instead of a greedy guess that overcharges on the tail.
 */
export function cheapestChunks(
  hours: number,
  rates: Partial<Record<DurationUnit, PricelistRule>>,
): PriceChunk[] {
  const available = UNITS_DESC.filter((u) => rates[u] != null);
  if (available.length === 0) return [];

  if (hours > DP_CEILING) return greedyChunks(hours, rates, available);

  const steps: Step[] = Array.from({ length: hours + 1 }, () => ({
    cost: Number.POSITIVE_INFINITY,
    unit: null,
  }));
  steps[0] = { cost: 0, unit: null };

  for (let h = 1; h <= hours; h += 1) {
    for (const unit of available) {
      const prev = Math.max(0, h - UNIT_HOURS[unit]);
      const candidate = steps[prev].cost + rates[unit]!.price;
      if (candidate < steps[h].cost) steps[h] = { cost: candidate, unit };
    }
  }

  const counts = new Map<DurationUnit, number>();
  let cursor = hours;
  while (cursor > 0) {
    const unit = steps[cursor].unit;
    if (!unit) break;
    counts.set(unit, (counts.get(unit) ?? 0) + 1);
    cursor = Math.max(0, cursor - UNIT_HOURS[unit]);
  }

  return UNITS_DESC.filter((u) => counts.has(u)).map((unit) => {
    const qty = counts.get(unit)!;
    const unitPrice = rates[unit]!.price;
    return { unit, qty, unitPrice, subtotal: round2(qty * unitPrice) };
  });
}

function greedyChunks(
  hours: number,
  rates: Partial<Record<DurationUnit, PricelistRule>>,
  available: DurationUnit[],
): PriceChunk[] {
  const chunks: PriceChunk[] = [];
  let remaining = hours;

  available.forEach((unit, index) => {
    const unitHours = UNIT_HOURS[unit];
    const isSmallest = index === available.length - 1;
    const qty = isSmallest ? Math.ceil(remaining / unitHours) : Math.floor(remaining / unitHours);
    if (qty <= 0) return;
    const unitPrice = rates[unit]!.price;
    chunks.push({ unit, qty, unitPrice, subtotal: round2(qty * unitPrice) });
    remaining = Math.max(0, remaining - qty * unitHours);
  });

  return chunks;
}

/** Price one catalog line across the rental window. */
export function priceLine(args: {
  product: Product;
  quantity: number;
  startsAt: string;
  endsAt: string;
  pricelist: Pricelist;
}): LinePricing {
  const { product, quantity, startsAt, endsAt, pricelist } = args;
  const hours = durationHours(startsAt, endsAt);
  const rates = resolveRates(pricelist, product);
  const chunks = cheapestChunks(hours, rates);

  const perUnitGross = chunks.reduce((sum, c) => sum + c.subtotal, 0);
  const gross = round2(perUnitGross * quantity);

  // Discounts come from the rules that actually priced this line.
  const applied = chunks.map((c) => rates[c.unit]!).filter(Boolean);
  const percent = Math.max(0, ...applied.map((r) => r.discountPercent), 0);
  const fixed = applied.reduce((sum, r) => sum + r.discountFixed, 0) * quantity;
  const discount = round2(Math.min(gross, gross * (percent / 100) + fixed));

  const dayRate = rates.day?.price;
  const naiveDayRate =
    dayRate != null ? round2(Math.ceil(hours / 24) * dayRate * quantity) : undefined;

  return {
    chunks,
    gross,
    discount,
    net: round2(gross - discount),
    pricelistId: pricelist.id,
    pricelistName: pricelist.name,
    naiveDayRate,
  };
}

export function describeChunks(chunks: PriceChunk[]): string {
  if (chunks.length === 0) return "No rate configured";
  return chunks
    .map((c) => `${c.qty} ${UNIT_LABEL[c.unit]}${c.qty > 1 ? "s" : ""}`)
    .join(" plus ");
}

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
