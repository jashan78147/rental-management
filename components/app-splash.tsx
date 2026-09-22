"use client";

import { useEffect, useState } from "react";
import { BrandGlyph } from "@/components/brand-mark";
import { BRAND } from "@/lib/data/seed";
import { SPLASH_KEY } from "@/lib/splash";

/**
 * The entry splash: brand, name, a filling bar, gone.
 *
 * It is rendered in the server HTML so it is painted on the very first frame
 * rather than flashing in after hydration. Two things keep it from being an
 * obstacle: an inline script in the document head hides it before paint once
 * the session has already seen it, and the page underneath is fully rendered
 * the whole time, so nothing is actually waiting on this.
 *
 * Skipped outright under prefers-reduced-motion, where a screen that covers
 * itself for a second is not a flourish.
 */
export function AppSplash() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Whether it is actually visible is CSS's call: the head script hides it
    // for a session that has already seen it, and the reduced-motion query
    // hides it outright. Both cases run this timer against a display:none
    // element, which costs nothing and keeps one code path here.
    const timer = setTimeout(() => {
      setDone(true);
      try {
        sessionStorage.setItem(SPLASH_KEY, "1");
      } catch {
        // Storage blocked, so it will show again on the next full load.
      }
    }, 1100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      aria-hidden="true"
      data-done={done ? "" : undefined}
      className="panel-dark splash fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden"
    >
      {/* The same drawn grid as the sign-in panel, so entry and login agree. */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.35) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.35) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(110% 80% at 50% 40%, #000 30%, transparent 78%)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        <span className="animate-breathe grid h-14 w-14 place-items-center rounded-2xl bg-gold text-on-gold shadow-lg shadow-black/25">
          <BrandGlyph className="h-8 w-8" />
        </span>

        <p className="mt-8 max-w-lg font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {BRAND.name}
        </p>
        <p className="mt-3 text-sm text-white/55">{BRAND.tagline}</p>

        <div className="mt-10 w-48">
          <span className="block h-1 overflow-hidden rounded-full bg-white/10">
            <span className="splash-bar block h-full rounded-full bg-gold" />
          </span>
          <p className="mt-3 text-xs font-medium uppercase tracking-[0.2em] text-white/40">
            Opening the store
          </p>
        </div>
      </div>
    </div>
  );
}
