import { allProducts, categoryById, pricelists, profileById, settings } from "@/lib/data/store";
import { availableUnits, nextFreeWindow } from "./availability";
import { durationHours, priceLine, round2, selectPricelists } from "./pricing";
import type { CartItem, CustomerSegment, PriceChunk, Reservation } from "./types";

export interface QuoteLine {
  productId: string;
  name: string;
  slug: string;
  imageUrl: string;
  category: string;
  quantity: number;
  available: number;
  shortBy: number;
  chunks: PriceChunk[];
  /** Which list actually supplied this line's rates. */
  pricelistName: string;
  gross: number;
  discount: number;
  net: number;
  deposit: number;
  naiveDayRate?: number;
  alternative?: { startsAt: string; endsAt: string };
}

export interface Quote {
  startsAt: string;
  endsAt: string;
  hours: number;
  pricelistId: string;
  pricelistName: string;
  segment: CustomerSegment;
  lines: QuoteLine[];
  subtotal: number;
  discountTotal: number;
  taxableBase: number;
  taxPercent: number;
  taxTotal: number;
  depositTotal: number;
  total: number;
  savingVsDayRate: number;
  blocked: boolean;
}

export function buildQuote(args: {
  items: CartItem[];
  startsAt: string;
  endsAt: string;
  reservations: Reservation[];
  customerId?: string;
  ignoreOrderId?: string;
}): Quote {
  const { items, startsAt, endsAt, reservations, customerId, ignoreOrderId } = args;

  const profile = customerId ? profileById(customerId) : undefined;
  const segment: CustomerSegment = profile?.segment ?? "retail";
  const applicable = selectPricelists(pricelists, segment, new Date(startsAt));
  const lists = applicable.length > 0 ? applicable : [pricelists[0]];

  const hours = durationHours(startsAt, endsAt);

  const lines: QuoteLine[] = items
    .map((item): QuoteLine | null => {
      const product = allProducts.find((p) => p.id === item.productId);
      if (!product) return null;

      const pricing = priceLine({ product, quantity: item.quantity, startsAt, endsAt, pricelists: lists });
      const available = availableUnits(product, reservations, startsAt, endsAt, ignoreOrderId);
      const shortBy = Math.max(0, item.quantity - available);

      return {
        productId: product.id,
        name: product.name,
        slug: product.slug,
        imageUrl: product.imageUrl,
        category: categoryById(product.categoryId)?.name ?? "Uncategorised",
        quantity: item.quantity,
        available,
        shortBy,
        chunks: pricing.chunks,
        pricelistName: pricing.pricelistName,
        gross: pricing.gross,
        discount: pricing.discount,
        net: pricing.net,
        deposit: round2(product.depositAmount * item.quantity),
        naiveDayRate: pricing.naiveDayRate,
        alternative:
          shortBy > 0
            ? (nextFreeWindow(product, reservations, item.quantity, startsAt, hours) ?? undefined)
            : undefined,
      };
    })
    .filter((line): line is QuoteLine => line !== null);

  const subtotal = round2(lines.reduce((sum, l) => sum + l.gross, 0));
  const discountTotal = round2(lines.reduce((sum, l) => sum + l.discount, 0));
  const taxableBase = round2(subtotal - discountTotal);
  const taxTotal = round2((taxableBase * settings.taxPercent) / 100);
  const depositTotal = round2(lines.reduce((sum, l) => sum + l.deposit, 0));

  const naiveTotal = lines.reduce((sum, l) => sum + (l.naiveDayRate ?? l.gross), 0);
  const savingVsDayRate = round2(Math.max(0, naiveTotal - subtotal));

  return {
    startsAt,
    endsAt,
    hours,
    pricelistId: lists[0].id,
    // Name the lists that actually priced something rather than the one that
    // merely ranked highest, which may not cover any of these products.
    pricelistName:
      [...new Set(lines.map((l) => l.pricelistName))].join(" and ") || lists[0].name,
    segment,
    lines,
    subtotal,
    discountTotal,
    taxableBase,
    taxPercent: settings.taxPercent,
    taxTotal,
    depositTotal,
    total: round2(taxableBase + taxTotal),
    savingVsDayRate,
    blocked: lines.some((l) => l.shortBy > 0),
  };
}
