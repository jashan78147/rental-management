import type { ReactNode } from "react";
import {
  ArmchairIcon,
  LightbulbFilamentIcon,
  MicrophoneIcon,
  PlugChargingIcon,
  VideoCameraIcon,
  WallIcon,
} from "@phosphor-icons/react/dist/ssr";
import { categoryById, productById } from "@/lib/data/store";
import { cn } from "@/lib/format";

/**
 * The catalog has no photography. Stock libraries returned the wrong subject
 * for almost every line (a boardroom for banquet chairs, a statue for a camera
 * body), often with a licence watermark burned in, and a mismatched photo is
 * worse than none on a site whose job is to show what it rents. A typed glyph
 * per category is unambiguous, weighs nothing and never loads the wrong thing.
 *
 * These return elements rather than component types, so nothing selects a
 * component during render.
 */
const CATEGORY_GLYPH: Record<string, (size: number) => ReactNode> = {
  "cat-camera": (size) => <VideoCameraIcon size={size} weight="duotone" />,
  "cat-light": (size) => <LightbulbFilamentIcon size={size} weight="duotone" />,
  "cat-audio": (size) => <MicrophoneIcon size={size} weight="duotone" />,
  "cat-stage": (size) => <WallIcon size={size} weight="duotone" />,
  "cat-power": (size) => <PlugChargingIcon size={size} weight="duotone" />,
  "cat-decor": (size) => <ArmchairIcon size={size} weight="duotone" />,
};

/** Each category gets its own tint so a grid of them reads as varied, not flat. */
const CATEGORY_TONE: Record<string, string> = {
  "cat-camera": "bg-clay-tint text-clay",
  "cat-light": "bg-ochre-tint text-ochre",
  "cat-audio": "bg-pine-tint text-pine",
  "cat-stage": "bg-sunken text-ink-soft",
  "cat-power": "bg-rust-tint text-rust",
  "cat-decor": "bg-clay-tint text-clay",
};

export function categoryGlyph(categoryId: string, size: number): ReactNode {
  return (CATEGORY_GLYPH[categoryId] ?? CATEGORY_GLYPH["cat-stage"])(size);
}

export function categoryTone(categoryId: string): string {
  return CATEGORY_TONE[categoryId] ?? "bg-sunken text-ink-soft";
}

const SIZE = {
  sm: { box: "h-12 w-12 rounded-lg", icon: 20 },
  md: { box: "h-14 w-14 rounded-lg", icon: 24 },
  lg: { box: "h-16 w-16 rounded-xl", icon: 28 },
  tile: { box: "aspect-[5/4] w-full", icon: 46 },
  hero: { box: "aspect-[4/3] w-full rounded-2xl", icon: 64 },
} as const;

/**
 * The single most distinguishing number on an item: "Full frame", "600W",
 * "15 kVA", "50 chairs". Without it three cameras in a row are the same tile.
 */
function headlineSpec(specs: Record<string, string> | undefined): string | null {
  if (!specs) return null;
  const value = Object.values(specs)[0];
  if (!value) return null;
  return value.length > 22 ? `${value.slice(0, 22)}…` : value;
}

export function ProductThumb({
  productId,
  size = "md",
  className,
}: {
  productId: string;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  const product = productById(productId);
  const categoryId = product?.categoryId ?? "cat-stage";
  const spec = SIZE[size];
  const label = size === "tile" || size === "hero" ? headlineSpec(product?.specs) : null;

  return (
    <span
      aria-hidden="true"
      title={categoryById(categoryId)?.name}
      className={cn(
        "grid shrink-0 place-content-center justify-items-center gap-2",
        spec.box,
        categoryTone(categoryId),
        className,
      )}
    >
      {categoryGlyph(categoryId, spec.icon)}
      {label ? (
        <span
          className={cn(
            "px-3 text-center font-medium leading-tight opacity-80",
            size === "hero" ? "text-base" : "text-xs",
          )}
        >
          {label}
        </span>
      ) : null}
    </span>
  );
}

export function CategoryThumb({
  categoryId,
  size = "tile",
  className,
}: {
  categoryId: string;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  const spec = SIZE[size];

  return (
    <span
      aria-hidden="true"
      className={cn("grid place-items-center", spec.box, categoryTone(categoryId), className)}
    >
      {categoryGlyph(categoryId, spec.icon)}
    </span>
  );
}
