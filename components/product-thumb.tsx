import type { ReactNode } from "react";
import {
  ArmchairIcon,
  LightbulbFilamentIcon,
  MicrophoneIcon,
  PlugChargingIcon,
  VideoCameraIcon,
  WallIcon,
} from "@phosphor-icons/react/dist/ssr";
import { GearArt } from "@/components/gear-art";
import { categoryById, productById } from "@/lib/data/store";
import { cn } from "@/lib/format";

/**
 * Small sizes keep a category glyph, which stays crisp at 48px where the line
 * work in the drawings would go muddy. Anything big enough to be a picture
 * gets the drawing. See components/gear-art.tsx for why these are drawn rather
 * than photographed.
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

type SizeKey = keyof typeof SIZE;

const IS_PICTURE: Record<SizeKey, boolean> = {
  sm: false,
  md: false,
  lg: false,
  tile: true,
  hero: true,
};

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
  size?: SizeKey;
  className?: string;
}) {
  const product = productById(productId);
  const categoryId = product?.categoryId ?? "cat-stage";
  const spec = SIZE[size];
  const picture = IS_PICTURE[size];

  if (!picture) {
    return (
      <span
        aria-hidden="true"
        title={categoryById(categoryId)?.name}
        className={cn(
          "grid shrink-0 place-content-center",
          spec.box,
          categoryTone(categoryId),
          className,
        )}
      >
        {categoryGlyph(categoryId, spec.icon)}
      </span>
    );
  }

  const label = headlineSpec(product?.specs);

  return (
    <span
      aria-hidden="true"
      title={product?.name}
      className={cn(
        "gear-plate group/plate relative block overflow-hidden",
        spec.box,
        categoryTone(categoryId),
        className,
      )}
    >
      <span className="gear-field absolute inset-0" />

      <GearArt
        productId={productId}
        categoryId={categoryId}
        className={cn(
          "gear-drawing relative",
          size === "hero" ? "p-8 sm:p-12" : "p-5",
        )}
      />

      {label ? (
        <span
          className={cn(
            "absolute bottom-0 left-0 right-0 truncate px-3 py-2 text-center font-medium leading-tight",
            size === "hero" ? "text-sm" : "text-[0.6875rem]",
          )}
          style={{ opacity: 0.75 }}
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
  size?: SizeKey;
  className?: string;
}) {
  const spec = SIZE[size];

  if (!IS_PICTURE[size]) {
    return (
      <span
        aria-hidden="true"
        className={cn("grid place-items-center", spec.box, categoryTone(categoryId), className)}
      >
        {categoryGlyph(categoryId, spec.icon)}
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        "gear-plate relative block overflow-hidden",
        spec.box,
        categoryTone(categoryId),
        className,
      )}
    >
      <span className="gear-field absolute inset-0" />
      <GearArt categoryId={categoryId} className="gear-drawing relative p-6" />
    </span>
  );
}
