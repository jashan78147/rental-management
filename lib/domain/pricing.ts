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
 * Every pricelist that applies to a customer on a given date, in precedence
 * order: a list scoped to the customer's segment beats a general one, then
 * higher priority wins.
 *
 * This returns the whole ordered set rather than a single winner because a
 * pricelist may only cover part of the catalog. A seasonal card that prices
 * staging must not blank out camera rates just because it outranks the base
 * card; anything it does not price falls through to the next list.
 */
export function selectPricelists(
  pricelists: Pricelist[],
  segment: CustomerSegment,
  onDate: Date = new Date(),
): Pricelist[] {
  const day = onDate.toISOString().slice(0, 10);

  return pricelists
    .filter((pl) => {
      if (!pl.isActive) return false;
      if (pl.segment && pl.segment !== segment) return false;
      if (pl.validFrom && day < pl.validFrom) return false;
      if (pl.validTo && day > pl.validTo) return false;
      return true;
    })
    .sort((a, b) => {
      const aScoped = a.segment ? 1 : 0;
      const bScoped = b.segment ? 1 : 0;
      if (aScoped !== bScoped) return bScoped - aScoped;
      return b.priority - a.priority;
    });
}

/** The highest-precedence list that applies, used for display and for the order record. */
export function selectPricelist(
  pricelists: Pricelist[],
  segment: CustomerSegment,
  onDate: Date = new Date(),
): Pricelist | undefined {
  return selectPricelists(pricelists, segment, onDate)[0];
}

/** How specifically a rule targets a product: product beats category beats catalog-wide. */
function scopeScore(rule: PricelistRule, product: Product): number {
  if (rule.productId) return rule.productId === product.id ? 3 : 0;
  if (rule.categoryId) return rule.categoryId === product.categoryId ? 2 : 0;
  return 1;
}

export interface ResolvedRates {
  rates: Partial<Record<DurationUnit, PricelistRule>>;
  /** Which list supplied each unit rate, so the quote can say where a price came from. */
  sources: Partial<Record<DurationUnit, string>>;
}

/**
 * Resolve a rate card for one product across the eligible lists.
 *
 * Within a list, the most specific matching rule wins. Across lists, the first
 * list to define a given unit wins and later lists cannot override it. Rules
 * priced at or below zero are discount modifiers, not rates, so they never
 * become the price.
 */
export function resolveRates(lists: Pricelist[], product: Product): ResolvedRates {
  const rates: Partial<Record<DurationUnit, PricelistRule>> = {};
  const sources: Partial<Record<DurationUnit, string>> = {};

  for (const list of lists) {
    const best: Partial<Record<DurationUnit, PricelistRule>> = {};

    for (const rule of list.rules) {
      if (rule.price <= 0) continue;
      const score = scopeScore(rule, product);
      if (score === 0) continue;
      const current = best[rule.unit];
      if (!current || scopeScore(current, product) < score) best[rule.unit] = rule;
    }

    for (const [unit, rule] of Object.entries(best) as [DurationUnit, PricelistRule][]) {
      if (rates[unit]) continue;
      rates[unit] = rule;
      sources[unit] = list.id;
    }
  }

  return { rates, sources };
}

export interface ResolvedDiscount {
  percent: number;
  fixed: number;
  pricelistId?: string;
  pricelistName?: string;
}

/**
 * Discounts come from the highest-precedence list that defines one for this
 * product. They are not summed across lists, so two overlapping promotions
 * cannot quietly compound into a bigger discount than either one offers.
 */
export function resolveDiscount(lists: Pricelist[], product: Product): ResolvedDiscount {
  for (const list of lists) {
    let best: PricelistRule | undefined;

    for (const rule of list.rules) {
      if (rule.discountPercent <= 0 && rule.discountFixed <= 0) continue;
      const score = scopeScore(rule, product);
      if (score === 0) continue;
      if (!best || scopeScore(best, product) < score) best = rule;
    }

    if (best) {
      return {
        percent: best.discountPercent,
        fixed: best.discountFixed,
        pricelistId: list.id,
        pricelistName: list.name,
      };
    }
  }

  return { percent: 0, fixed: 0 };
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

/**
 * Price one catalog line across the rental window.
 *
 * Takes the ordered list of eligible pricelists rather than a single one, so a
 * partial seasonal card cannot leave a product with no rate at all.
 */
export function priceLine(args: {
  product: Product;
  quantity: number;
  startsAt: string;
  endsAt: string;
  pricelists: Pricelist[];
}): LinePricing {
  const { product, quantity, startsAt, endsAt, pricelists } = args;
  const hours = durationHours(startsAt, endsAt);
  const { rates, sources } = resolveRates(pricelists, product);
  const chunks = cheapestChunks(hours, rates);

  const perUnitGross = chunks.reduce((sum, c) => sum + c.subtotal, 0);
  const gross = round2(perUnitGross * quantity);

  const { percent, fixed, pricelistId: discountListId } = resolveDiscount(pricelists, product);
  const discount = round2(Math.min(gross, gross * (percent / 100) + fixed * quantity));

  // Attribute the line to whichever list actually supplied its rates, falling
  // back to the discount's list, then to the highest-precedence list.
  const ratingListId = chunks.length > 0 ? sources[chunks[0].unit] : undefined;
  const attributed =
    pricelists.find((p) => p.id === (ratingListId ?? discountListId)) ?? pricelists[0];

  const dayRate = rates.day?.price;
  const naiveDayRate =
    dayRate != null ? round2(Math.ceil(hours / 24) * dayRate * quantity) : undefined;

  return {
    chunks,
    gross,
    discount,
    net: round2(gross - discount),
    pricelistId: attributed?.id ?? "",
    pricelistName: attributed?.name ?? "No rate card",
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
