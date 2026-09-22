import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { allProducts, categoryById, productById } from "@/lib/data/store";
import type { Dataset } from "@/lib/data/store";
import { availableUnits } from "@/lib/domain/availability";
import type { Product, RentalOrder, Reservation } from "@/lib/domain/types";
import { AI_MODEL, aiClient, aiConfigured, describeAiError } from "./client";

export interface Suggestion {
  productId: string;
  name: string;
  slug: string;
  imageUrl: string;
  reason: string;
  available: number;
  confidence: "high" | "medium" | "low";
}

export interface RecommendationResult {
  suggestions: Suggestion[];
  source: "claude" | "affinity";
  note?: string;
}

const SuggestionSchema = z.object({
  suggestions: z
    .array(
      z.object({
        product_id: z.string(),
        reason: z.string(),
        confidence: z.enum(["high", "medium", "low"]),
      }),
    )
    .max(4),
});

/**
 * How often two products have appeared on the same order.
 * Doubles as the no-key fallback and as a signal handed to the model.
 */
export function coRentalAffinity(orders: RentalOrder[]): Map<string, Map<string, number>> {
  const affinity = new Map<string, Map<string, number>>();

  for (const order of orders) {
    const ids = [...new Set(order.lines.map((l) => l.productId))];
    for (const a of ids) {
      for (const b of ids) {
        if (a === b) continue;
        const row = affinity.get(a) ?? new Map<string, number>();
        row.set(b, (row.get(b) ?? 0) + 1);
        affinity.set(a, row);
      }
    }
  }

  return affinity;
}

function availabilityFor(
  product: Product,
  reservations: Reservation[],
  startsAt: string,
  endsAt: string,
): number {
  return availableUnits(product, reservations, startsAt, endsAt);
}

function toSuggestion(
  product: Product,
  reason: string,
  confidence: Suggestion["confidence"],
  reservations: Reservation[],
  startsAt: string,
  endsAt: string,
): Suggestion {
  return {
    productId: product.id,
    name: product.name,
    slug: product.slug,
    imageUrl: product.imageUrl,
    reason,
    available: availabilityFor(product, reservations, startsAt, endsAt),
    confidence,
  };
}

/** Deterministic recommender: co-rental history first, shared tags second. */
export function affinityRecommend(
  store: Dataset,
  cartProductIds: string[],
  startsAt: string,
  endsAt: string,
  limit = 4,
): Suggestion[] {
  if (cartProductIds.length === 0) return [];

  const affinity = coRentalAffinity(store.orders);
  const inCart = new Set(cartProductIds);
  const scores = new Map<string, number>();

  for (const id of cartProductIds) {
    for (const [other, count] of affinity.get(id) ?? []) {
      if (inCart.has(other)) continue;
      scores.set(other, (scores.get(other) ?? 0) + count * 3);
    }
  }

  const cartTags = new Set(cartProductIds.flatMap((id) => productById(id)?.tags ?? []));
  for (const product of allProducts) {
    if (inCart.has(product.id)) continue;
    const shared = product.tags.filter((t) => cartTags.has(t)).length;
    if (shared > 0) scores.set(product.id, (scores.get(product.id) ?? 0) + shared);
  }

  return [...scores.entries()]
    .map(([id, score]) => ({ product: productById(id), score }))
    .filter((row): row is { product: Product; score: number } => Boolean(row.product))
    .filter((row) => availabilityFor(row.product, store.reservations, startsAt, endsAt) > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((row) => {
      const shared = row.product.tags.filter((t) => cartTags.has(t));
      const reason = shared.length
        ? `Booked alongside this kit before, and covers ${shared.slice(0, 2).join(" and ")}.`
        : "Frequently added to orders with the same shape.";
      return toSuggestion(
        row.product,
        reason,
        row.score >= 6 ? "high" : row.score >= 3 ? "medium" : "low",
        store.reservations,
        startsAt,
        endsAt,
      );
    });
}

function catalogContext(store: Dataset, startsAt: string, endsAt: string): string {
  return allProducts
    .map((p) => {
      const free = availabilityFor(p, store.reservations, startsAt, endsAt);
      return [
        p.id,
        p.name,
        categoryById(p.categoryId)?.name ?? "",
        `tags: ${p.tags.join(", ")}`,
        `free units in window: ${free}`,
      ].join(" | ");
    })
    .join("\n");
}

const SYSTEM = `You are the kit advisor for a rental house that hires out film, event and staging equipment.

Given the items already in a customer's cart, suggest up to four additional catalog items that make the job actually work. Prefer:
- Items that prevent a failed shoot or event: power for lights, batteries for cameras, distro for a generator, comms for a live crew.
- Items the same kind of order has historically included.
- Items with free units in the requested window. Never suggest an item with zero free units.

Rules:
- Only use product_id values from the catalog given to you. Never invent an id.
- Never suggest an item already in the cart.
- Each reason is one sentence, under 110 characters, concrete about why this job needs it. No marketing language.
- If nothing genuinely adds value, return fewer suggestions or an empty list.`;

export async function recommendKit(args: {
  store: Dataset;
  cartProductIds: string[];
  startsAt: string;
  endsAt: string;
}): Promise<RecommendationResult> {
  const { store, cartProductIds, startsAt, endsAt } = args;

  if (cartProductIds.length === 0) {
    return { suggestions: [], source: "affinity" };
  }

  if (!aiConfigured()) {
    return {
      suggestions: affinityRecommend(store, cartProductIds, startsAt, endsAt),
      source: "affinity",
      note: "Set ANTHROPIC_API_KEY to switch this panel to Claude.",
    };
  }

  const affinity = coRentalAffinity(store.orders);
  const historySignal = cartProductIds
    .flatMap((id) =>
      [...(affinity.get(id) ?? [])]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([other, count]) => `${productById(id)?.name} + ${productById(other)?.name}: ${count} past orders`),
    )
    .join("\n");

  const cartLines = cartProductIds
    .map((id) => {
      const p = productById(id);
      return p ? `${p.id} | ${p.name} | tags: ${p.tags.join(", ")}` : null;
    })
    .filter(Boolean)
    .join("\n");

  try {
    const response = await aiClient().messages.parse({
      model: AI_MODEL,
      max_tokens: 4000,
      thinking: { type: "adaptive" },
      system: [
        {
          type: "text",
          text: `${SYSTEM}\n\nCATALOG\n${catalogContext(store, startsAt, endsAt)}`,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: `Rental window: ${startsAt} to ${endsAt}\n\nCART\n${cartLines}\n\nCO-RENTAL HISTORY\n${historySignal || "No history for these items yet."}`,
        },
      ],
      output_config: { format: zodOutputFormat(SuggestionSchema) },
    });

    const parsed = response.parsed_output;
    if (!parsed) throw new Error("Model returned no parseable suggestions.");

    const inCart = new Set(cartProductIds);
    const suggestions = parsed.suggestions
      .map((s) => ({ product: productById(s.product_id), s }))
      .filter((row) => row.product && !inCart.has(row.product.id))
      .map((row) =>
        toSuggestion(row.product!, row.s.reason, row.s.confidence, store.reservations, startsAt, endsAt),
      )
      .filter((s) => s.available > 0)
      .slice(0, 4);

    if (suggestions.length === 0) {
      return {
        suggestions: affinityRecommend(store, cartProductIds, startsAt, endsAt),
        source: "affinity",
        note: "Claude had nothing to add, so this falls back to booking history.",
      };
    }

    return { suggestions, source: "claude" };
  } catch (error) {
    return {
      suggestions: affinityRecommend(store, cartProductIds, startsAt, endsAt),
      source: "affinity",
      note: describeAiError(error),
    };
  }
}
