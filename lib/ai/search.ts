import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { allProducts, categoryById, productById } from "@/lib/data/store";
import type { Dataset } from "@/lib/data/store";
import { availableUnits } from "@/lib/domain/availability";
import { AI_MODEL, aiClient, aiConfigured, describeAiError } from "./client";
import { ruleBasedKit } from "./rules";

export interface SearchPick {
  productId: string;
  name: string;
  slug: string;
  imageUrl: string;
  quantity: number;
  why: string;
  available: number;
}

export interface SearchResult {
  understood: string;
  suggestedDurationHours: number | null;
  picks: SearchPick[];
  missing: string[];
  source: "claude" | "rules" | "keyword";
  note?: string;
}

/**
 * The no-key path. The rule engine reads the brief into a structured shape and
 * applies the desk's dependency rules; keyword overlap is only a last resort
 * for a brief too vague to infer anything from.
 */
function rulesResult(
  store: Dataset,
  query: string,
  startsAt: string,
  endsAt: string,
): SearchResult {
  const kit = ruleBasedKit(query, startsAt, endsAt, store.reservations);

  if (kit.picks.length === 0) {
    return {
      understood: `Nothing specific to infer from that, so this is a plain keyword match.`,
      suggestedDurationHours: null,
      picks: keywordSearch(store, query, startsAt, endsAt),
      missing: ["Name the kind of job, the rough size, and whether there is power on site."],
      source: "keyword",
    };
  }

  return {
    understood: kit.understood,
    suggestedDurationHours: kit.suggestedDurationHours,
    picks: kit.picks.map((pick) => ({
      productId: pick.product.id,
      name: pick.product.name,
      slug: pick.product.slug,
      imageUrl: pick.product.imageUrl,
      quantity: pick.quantity,
      why: pick.why,
      available: pick.available,
    })),
    missing: kit.missing,
    source: "rules",
  };
}

const SearchSchema = z.object({
  understood: z.string(),
  suggested_duration_hours: z.number().nullable(),
  picks: z
    .array(
      z.object({
        product_id: z.string(),
        quantity: z.number().int().min(1).max(60),
        why: z.string(),
      }),
    )
    .max(8),
  missing: z.array(z.string()).max(3),
});

const SYSTEM = `You turn a plain-language rental brief into a bookable kit for a film, event and staging rental house.

Read the brief and build the smallest kit that would actually let the job happen. Think about what the job implies, not just what the words name: an outdoor shoot needs power, a long day needs batteries, a live event with a crew needs comms, a large room needs more light than a small one.

Rules:
- Only use product_id values from the catalog. Never invent an id.
- quantity must respect the free units shown for each item. Never exceed them.
- "why" is one sentence under 110 characters, specific to this brief.
- suggested_duration_hours is your read of how long they need the kit, or null if the brief does not imply one.
- "missing" lists at most three things the customer still needs to tell you before this quote is firm. Leave it empty if the brief is clear.
- Prefer four to seven picks. A kit that is all cameras and no support is a bad kit.`;

function catalogContext(store: Dataset, startsAt: string, endsAt: string): string {
  return allProducts
    .map((p) => {
      const free = availableUnits(p, store.reservations, startsAt, endsAt);
      return `${p.id} | ${p.name} | ${categoryById(p.categoryId)?.name} | tags: ${p.tags.join(", ")} | ${p.description.slice(0, 90)} | free units: ${free}`;
    })
    .join("\n");
}

/** Token overlap against name, tags and description. Used when no key is set. */
export function keywordSearch(
  store: Dataset,
  query: string,
  startsAt: string,
  endsAt: string,
): SearchPick[] {
  const terms = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2);

  if (terms.length === 0) return [];

  return allProducts
    .map((product) => {
      const haystack = `${product.name} ${product.tags.join(" ")} ${product.description}`.toLowerCase();
      const score = terms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0);
      const available = availableUnits(product, store.reservations, startsAt, endsAt);
      return { product, score, available };
    })
    .filter((row) => row.score > 0 && row.available > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((row) => ({
      productId: row.product.id,
      name: row.product.name,
      slug: row.product.slug,
      imageUrl: row.product.imageUrl,
      quantity: 1,
      why: `Matches ${row.score === 1 ? "a term" : `${row.score} terms`} in your search.`,
      available: row.available,
    }));
}

export async function searchKit(args: {
  store: Dataset;
  query: string;
  startsAt: string;
  endsAt: string;
}): Promise<SearchResult> {
  const { store, query, startsAt, endsAt } = args;

  if (!aiConfigured()) return rulesResult(store, query, startsAt, endsAt);

  try {
    const response = await aiClient().messages.parse({
      model: AI_MODEL,
      max_tokens: 6000,
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
          content: `Rental window under consideration: ${startsAt} to ${endsAt}\n\nBRIEF\n${query}`,
        },
      ],
      output_config: { format: zodOutputFormat(SearchSchema) },
    });

    const parsed = response.parsed_output;
    if (!parsed) throw new Error("Model returned no parseable kit.");

    const picks: SearchPick[] = parsed.picks
      .map((pick) => {
        const product = productById(pick.product_id);
        if (!product) return null;
        const available = availableUnits(product, store.reservations, startsAt, endsAt);
        if (available <= 0) return null;
        return {
          productId: product.id,
          name: product.name,
          slug: product.slug,
          imageUrl: product.imageUrl,
          quantity: Math.min(pick.quantity, available),
          why: pick.why,
          available,
        };
      })
      .filter((p): p is SearchPick => p !== null);

    return {
      understood: parsed.understood,
      suggestedDurationHours: parsed.suggested_duration_hours,
      picks,
      missing: parsed.missing,
      source: "claude",
    };
  } catch (error) {
    return { ...rulesResult(store, query, startsAt, endsAt), note: describeAiError(error) };
  }
}
