import { cn } from "@/lib/format";

/**
 * The mark is a flight case seen head on: a rounded shell, a lid seam across
 * it, and two corner catches. It reads at 24px, it is not a generic cube, and
 * it says "this business moves equipment around" without needing a caption.
 */
export function BrandGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn("h-full w-full", className)}
    >
      {/* Case shell */}
      <rect
        x="4.5"
        y="7.5"
        width="23"
        height="17"
        rx="3.5"
        stroke="currentColor"
        strokeWidth="2"
      />
      {/* Lid seam */}
      <path d="M4.5 14.5h23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {/* Handle */}
      <path
        d="M13 7.5v-1a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 19 6.5v1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Catches */}
      <path d="M10 19.5h3M19 19.5h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function BrandMark({
  size = "md",
  subtitle = true,
  tone = "default",
  className,
}: {
  size?: "sm" | "md" | "lg";
  subtitle?: boolean;
  /** "onDark" for the navy panels, where the tile inverts. */
  tone?: "default" | "onDark";
  className?: string;
}) {
  const box =
    size === "lg" ? "h-12 w-12 rounded-xl" : size === "sm" ? "h-8 w-8 rounded-lg" : "h-9 w-9 rounded-[10px]";
  const wordmark =
    size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-lg";

  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "grid shrink-0 place-items-center",
          box,
          tone === "onDark" ? "bg-gold text-on-gold" : "bg-clay text-on-clay",
        )}
      >
        <BrandGlyph className={size === "lg" ? "h-7 w-7" : size === "sm" ? "h-4.5 w-4.5" : "h-5 w-5"} />
      </span>

      <span className="flex min-w-0 flex-col leading-none">
        <span
          className={cn(
            "font-display font-semibold tracking-tight",
            wordmark,
            tone === "onDark" ? "text-white" : "text-ink",
          )}
          translate="no"
        >
          Bandobast
        </span>
        {subtitle ? (
          <span
            className={cn(
              "mt-1 text-[0.62rem] font-medium uppercase tracking-[0.18em]",
              tone === "onDark" ? "text-white/55" : "text-ink-faint",
            )}
          >
            Equipment hire
          </span>
        ) : null}
      </span>
    </span>
  );
}
