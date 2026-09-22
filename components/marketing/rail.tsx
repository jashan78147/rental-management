"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/format";

/**
 * Horizontal scroller with arrow controls.
 *
 * The arrows are a convenience on top of a plain scroll container, not a
 * replacement for it: the rail stays swipeable, keyboard scrollable and
 * snap-aligned, and the arrows disable themselves at each end rather than
 * wrapping, so nothing moves when there is nowhere to go.
 */
export function Rail({
  children,
  label,
  className,
  itemClassName,
}: {
  children: React.ReactNode;
  label: string;
  className?: string;
  itemClassName?: string;
}) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const sync = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    sync();
    const el = trackRef.current;
    if (!el) return;
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => observer.disconnect();
  }, [sync]);

  function nudge(direction: -1 | 1) {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * Math.round(el.clientWidth * 0.8), behavior: "smooth" });
  }

  return (
    <div className={cn("relative", className)}>
      <div className="mb-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => nudge(-1)}
          disabled={atStart}
          aria-label={`Scroll ${label} backwards`}
          className="grid h-9 w-9 place-items-center rounded-full border border-line bg-raised text-ink-soft transition-[transform,color,border-color] duration-150 ease-[var(--ease-out)] hover:border-clay hover:text-clay active:scale-95 disabled:pointer-events-none disabled:opacity-35"
        >
          <CaretLeft size={16} weight="bold" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => nudge(1)}
          disabled={atEnd}
          aria-label={`Scroll ${label} forwards`}
          className="grid h-9 w-9 place-items-center rounded-full border border-line bg-raised text-ink-soft transition-[transform,color,border-color] duration-150 ease-[var(--ease-out)] hover:border-clay hover:text-clay active:scale-95 disabled:pointer-events-none disabled:opacity-35"
        >
          <CaretRight size={16} weight="bold" aria-hidden="true" />
        </button>
      </div>

      <ul
        ref={trackRef}
        onScroll={sync}
        aria-label={label}
        className={cn(
          "scrollbar-none flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2",
          itemClassName,
        )}
      >
        {children}
      </ul>
    </div>
  );
}
