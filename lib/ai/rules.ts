import { dataset, productById } from "@/lib/data/store";
import { availableUnits } from "@/lib/domain/availability";
import type { Product } from "@/lib/domain/types";

/**
 * Rule-based kit builder.
 *
 * This is the engine behind the kit finder when no model is configured. It is
 * not keyword matching: it reads a brief into a structured shape, then applies
 * the dependency rules a rental desk applies by habit. Lights drawn off-grid
 * need a generator and distro. Cameras away from a wall socket need batteries.
 * A live crew needs comms. A bigger room needs more output.
 *
 * Every rule is inspectable, which is the point. It also never rate-limits and
 * never fails mid-demo.
 */

export interface Brief {
  durationHours: number | null;
  job: "film" | "event" | "unknown";
  subtype: string | null;
  outdoor: boolean;
  /** true = mains available, false = explicitly none, null = not stated. */
  mainsPower: boolean | null;
  guests: number | null;
  cameras: number | null;
  crew: number | null;
  night: boolean;
  syncSound: boolean;
  travelling: boolean;
  large: boolean;
  premium: boolean;
}

export interface RulePick {
  productId: string;
  quantity: number;
  why: string;
  /** Lower sorts first, so the kit reads in the order a desk would pull it. */
  order: number;
}

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, fourteen: 14,
  a: 1, an: 1, couple: 2, few: 3,
};

const UNIT_HOURS: Record<string, number> = {
  hour: 1, hr: 1, day: 24, night: 24, week: 168, fortnight: 336, month: 720,
};

function has(text: string, ...terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

function countFrom(match: RegExpMatchArray | null): number | null {
  if (!match) return null;
  const raw = match[1].toLowerCase();
  const value = NUMBER_WORDS[raw] ?? Number(raw);
  return Number.isFinite(value) ? value : null;
}

export function parseBrief(query: string): Brief {
  const text = ` ${query.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ")} `;

  // Duration: "three day", "3-day", "week long", "overnight".
  let durationHours: number | null = null;
  const span = text.match(
    /\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fourteen|a|an|couple|few)[\s-]*(hour|hr|day|night|week|fortnight|month)s?\b/,
  );
  if (span) {
    const qty = countFrom(span);
    const unit = UNIT_HOURS[span[2]];
    if (qty && unit) durationHours = qty * unit;
  }
  if (!durationHours && has(text, "week long", "week-long", "weeklong")) durationHours = 168;
  if (!durationHours && has(text, "overnight")) durationHours = 12;
  if (!durationHours && has(text, "weekend")) durationHours = 48;

  const outdoor = has(
    text, "outdoor", "outside", "on location", "open air", "lawn", "ground", "field",
    "beach", "rooftop", "garden", "ghat", "highway", "road", "forest", "terrace", "farm",
  );

  let mainsPower: boolean | null = null;
  if (has(text, "no mains", "no power", "without power", "off grid", "off-grid", "no electricity", "no socket")) {
    mainsPower = false;
  } else if (has(text, "studio", "indoor", "banquet hall", "mains", "hotel", "office")) {
    mainsPower = true;
  }

  const filmish = has(
    text, "shoot", "shooting", "film", "filming", "video", "documentary", "commercial",
    "advert", "campaign", "interview", "testimonial", "music video", "fashion", "narrative",
    "series", "broadcast", "podcast", "reel", "content",
  );
  const eventish = has(
    text, "wedding", "sangeet", "reception", "engagement", "mehendi", "haldi", "conference",
    "launch", "exhibition", "seminar", "town hall", "townhall", "party", "function",
    "concert", "gig", "summit", "expo", "convocation", "ceremony", "guests", "attendees",
  );

  const job: Brief["job"] = filmish && !eventish ? "film" : eventish && !filmish ? "event" : filmish && eventish ? "event" : "unknown";

  const SUBTYPES = [
    "documentary", "music video", "commercial", "interview", "wedding", "reception",
    "sangeet", "conference", "launch", "exhibition", "concert", "fashion", "podcast",
  ];
  const subtype = SUBTYPES.find((s) => text.includes(s)) ?? null;

  const guests = countFrom(
    text.match(/\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s*(?:\+\s*)?(?:guests?|people|pax|attendees?|heads?|audience)\b/),
  );
  const cameras = countFrom(
    text.match(/\b(\d+|one|two|three|four|five|six|a|an|couple)\s*(?:camera|cam|angle|unit)s?\b/),
  );
  const crew = countFrom(text.match(/\b(\d+|one|two|three|four|five|six|eight|ten|twelve)\s*(?:crew|operators?|technicians?|team)\b/));

  return {
    durationHours,
    job,
    subtype,
    outdoor,
    mainsPower,
    guests,
    cameras,
    crew,
    night: has(text, "night", "evening", "after dark", "overnight"),
    syncSound: has(text, "sync sound", "dialogue", "interview", "documentary", "speech", "presenter", "podcast", "audio"),
    travelling: has(text, "travel", "travelling", "traveling", "across", "multiple locations", "districts", "towns", "cities", "moving"),
    large: has(text, "large", "big", "huge", "wide", "warehouse", "hall", "arena", "stadium", "pavilion") || (guests ?? 0) > 400,
    premium: has(text, "premium", "high end", "high-end", "flagship", "hero", "cinematic", "commercial", "car", "luxury"),
  };
}

/** Turn the parsed brief into a kit, applying the dependency rules in order. */
export function composeKit(brief: Brief): RulePick[] {
  const picks = new Map<string, RulePick>();

  const add = (productId: string, quantity: number, why: string, order: number) => {
    if (quantity <= 0) return;
    const existing = picks.get(productId);
    if (existing) {
      existing.quantity = Math.max(existing.quantity, quantity);
      return;
    }
    picks.set(productId, { productId, quantity, why, order });
  };

  const offGrid = brief.mainsPower === false || (brief.outdoor && brief.mainsPower !== true);

  if (brief.job === "film" || brief.job === "unknown") {
    const angles = Math.max(1, Math.min(3, brief.cameras ?? 1));

    if (brief.premium) {
      add("p-komodo", 1, "Global shutter body, which is what commercial and car work needs.", 10);
      if (angles > 1) add("p-fx6", angles - 1, "Second angle that cuts cleanly against the A-camera.", 11);
    } else {
      add("p-fx6", angles > 2 ? 2 : 1, "Full-frame body with internal ND, so exposure holds as the light moves.", 10);
      if (angles > 1) add("p-c70", angles - 1, "Compact second angle on the same colour science.", 11);
    }

    if (brief.premium || has(brief.subtype ?? "", "fashion", "commercial", "music video")) {
      add("p-primes", 1, "Matched primes keep the look consistent across every setup.", 12);
    }

    // Lighting scales with the space, not the camera count.
    if (brief.large) {
      add("p-evoke", 2, "1200W punch, because a large interior eats a 600W source.", 20);
    } else {
      add("p-600d", brief.night ? 3 : 2, brief.night ? "Night work needs more output than you think, three sources minimum." : "Two-source key and fill for a controlled setup.", 20);
    }

    if (brief.outdoor) {
      add("p-butterfly", 1, "Outdoors the sun is your key, so the frame is what actually shapes it.", 21);
    }

    if (brief.syncSound) {
      add("p-mixpre", 1, "Timecode recorder so sound and picture sync without guesswork.", 30);
      add("p-shotgun", angles > 1 ? 2 : 1, "Boom kit for usable dialogue rather than camera-top audio.", 31);
    }

    if (has(brief.subtype ?? "", "music video") || brief.night) {
      add("p-tubes", 2, "Battery RGB tubes for accents you can place without running cable.", 22);
    }

    if (brief.travelling || brief.outdoor) {
      add("p-vmount", Math.max(1, Math.ceil(angles / 2)), "Battery sets, because away from a wall socket runtime is the constraint.", 40);
    }

    if (brief.travelling) {
      add("p-gimbal", 1, "Stabiliser for the moving shots a travelling schedule always ends up needing.", 13);
    }
  }

  if (brief.job === "event") {
    const guests = brief.guests ?? 200;

    if (guests >= 150 || has(brief.subtype ?? "", "concert", "launch", "conference")) {
      add("p-pa", 1, `Line array sized for ${guests} people, with the desk and rigging included.`, 10);
    }

    add("p-comms", Math.max(1, Math.ceil((brief.crew ?? 6) / 6)), "Crew comms, so the stage and the desk are not shouting across the room.", 11);

    if (has(brief.subtype ?? "", "wedding", "reception", "sangeet") || guests >= 100) {
      add("p-chairs", Math.max(1, Math.ceil(guests / 50)), "Banquet seating in sets of 50, delivered on trolleys.", 20);
      add("p-tables", Math.max(1, Math.ceil(guests / 60)), "Cocktail rounds for the standing areas.", 21);
    }

    if (has(brief.subtype ?? "", "wedding", "reception", "launch") || brief.premium) {
      add("p-lounge", 2, "Lounge clusters give guests somewhere to sit that is not a dinner chair.", 22);
    }

    // Staging scales with headcount: roughly one 8x4 deck per 25 guests of sightline.
    const decks = Math.max(8, Math.ceil(guests / 25));
    add("p-deck", decks, "Stage decking, adjustable from 40cm to 100cm, sized off the headcount.", 30);
    add("p-truss", Math.max(6, Math.ceil(decks * 0.8)), "Truss to hang lighting and banners above the stage rather than beside it.", 31);

    if (brief.outdoor || guests >= 400 || has(brief.subtype ?? "", "concert")) {
      add("p-barrier", Math.max(2, Math.ceil(guests / 200)), "Barriers to keep the crowd off the stage edge and the cable runs.", 32);
    }

    add("p-tubes", 2, "RGB tubes for colour wash on the stage and the backdrop.", 25);
  }

  // Power is a consequence of everything above, so it resolves last.
  const drawsPower = [...picks.keys()].some((id) =>
    ["p-600d", "p-evoke", "p-tubes", "p-pa", "p-deck", "p-truss"].includes(id),
  );

  if (offGrid && drawsPower) {
    const heavy = picks.has("p-pa") || picks.has("p-evoke") || (brief.guests ?? 0) >= 300;
    add("p-genset", heavy ? 2 : 1, "No mains on site, so the lights and desk need their own supply.", 50);
    add("p-distro", heavy ? 3 : 2, "Distro with RCD protection, so one fault does not drop the whole site.", 51);
  } else if (drawsPower && picks.size >= 4) {
    add("p-distro", 1, "Distro box so everything is not daisy-chained off one wall socket.", 51);
  }

  return [...picks.values()].sort((a, b) => a.order - b.order);
}

/** A readable sentence describing what the engine understood. */
export function describeBrief(brief: Brief): string {
  const parts: string[] = [];

  if (brief.durationHours) {
    parts.push(
      brief.durationHours < 24
        ? `${brief.durationHours} hour hire`
        : brief.durationHours < 168
          ? `${Math.round(brief.durationHours / 24)} day hire`
          : `${Math.round(brief.durationHours / 168)} week hire`,
    );
  }

  if (brief.job === "film") parts.push(brief.subtype ? `${brief.subtype} shoot` : "shoot");
  else if (brief.job === "event") parts.push(brief.subtype ? `${brief.subtype}` : "live event");

  if (brief.guests) parts.push(`${brief.guests} guests`);
  if (brief.cameras && brief.job === "film") parts.push(`${brief.cameras} camera angles`);
  if (brief.outdoor) parts.push("outdoors");
  if (brief.mainsPower === false) parts.push("no mains power");
  if (brief.night) parts.push("running into the night");
  if (brief.travelling) parts.push("moving between locations");

  if (parts.length === 0) return "Read as a general hire. Naming the job and the rough size sharpens this a lot.";

  const head = parts[0][0].toUpperCase() + parts[0].slice(1);
  return [head, ...parts.slice(1)].join(", ") + ".";
}

/** At most three things the desk would still need to ask. */
export function openQuestions(brief: Brief, picks: RulePick[]): string[] {
  const questions: string[] = [];

  if (!brief.durationHours) {
    questions.push("How long do you need the kit for? The dates above are a placeholder.");
  }
  if (brief.job === "event" && !brief.guests) {
    questions.push("Roughly how many guests? Seating, staging and PA all scale off that number.");
  }
  if (brief.mainsPower === null && (brief.outdoor || picks.some((p) => p.productId === "p-genset"))) {
    questions.push("Is there mains power on site, or should we quote a generator?");
  }
  if (brief.job === "unknown") {
    questions.push("Is this a shoot or a live event? The kit differs completely.");
  }
  if (brief.job === "film" && !brief.cameras) {
    questions.push("How many camera angles are you running?");
  }

  return questions.slice(0, 3);
}

export interface RuleKitResult {
  understood: string;
  suggestedDurationHours: number | null;
  picks: { product: Product; quantity: number; why: string; available: number; short: boolean }[];
  missing: string[];
}

/** Without these the job does not happen, so they survive truncation. */
const ESSENTIAL = new Set(["p-genset", "p-distro", "p-vmount"]);

const MAX_PICKS = 9;

export function ruleBasedKit(query: string, startsAt: string, endsAt: string): RuleKitResult {
  const brief = parseBrief(query);
  const composed = composeKit(brief);
  const { reservations } = dataset();

  const resolved = composed
    .map((pick) => {
      const product = productById(pick.productId);
      if (!product) return null;
      const available = availableUnits(product, reservations, startsAt, endsAt);
      if (available <= 0) return null;

      // The rule asked for a quantity the fleet may not have free. Say so on the
      // line rather than silently quoting less than the job needs.
      const short = pick.quantity > available;
      return {
        product,
        quantity: Math.min(pick.quantity, available),
        why: short
          ? `${pick.why} Only ${available} of the ${pick.quantity} needed are free, so this is short.`
          : pick.why,
        available,
        short,
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  // Power resolves last, so a naive slice would drop the generator off an
  // off-grid job and quote lights with nothing to run them on.
  const essential = resolved.filter((p) => ESSENTIAL.has(p.product.id));
  const rest = resolved.filter((p) => !ESSENTIAL.has(p.product.id));
  const picks = [...essential, ...rest.slice(0, Math.max(0, MAX_PICKS - essential.length))].sort(
    (a, b) =>
      composed.findIndex((c) => c.productId === a.product.id) -
      composed.findIndex((c) => c.productId === b.product.id),
  );

  return {
    understood: describeBrief(brief),
    suggestedDurationHours: brief.durationHours,
    picks,
    missing: openQuestions(brief, composed),
  };
}
