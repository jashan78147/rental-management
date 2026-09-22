"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Moon, ShoppingBag, Sun } from "@phosphor-icons/react/dist/ssr";
import { useCart } from "@/components/cart-provider";
import { BRAND } from "@/lib/data/seed";
import { cn } from "@/lib/format";

const NAV = [
  { href: "/catalog", label: "Catalog" },
  { href: "/portal", label: "My Rentals" },
  { href: "/console", label: "Operations" },
];

function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("bandobast-theme");
      if (stored === "dark" || stored === "light") {
        setTheme(stored);
        return;
      }
    } catch {
      // Storage blocked; fall through to the system preference.
    }
    setTheme(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("bandobast-theme", next);
    } catch {
      // Preference just will not persist.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      className="grid h-9 w-9 place-items-center rounded-lg border border-line text-ink-soft transition-colors hover:border-clay hover:text-clay"
    >
      {theme === "dark" ? (
        <Sun size={17} weight="bold" aria-hidden="true" />
      ) : (
        <Moon size={17} weight="bold" aria-hidden="true" />
      )}
    </button>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const { count, ready } = useCart();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-sticky backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 font-display text-lg font-semibold">
          <span
            aria-hidden="true"
            className="grid h-8 w-8 place-items-center rounded-lg bg-clay text-on-clay"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M4 8.5 12 4l8 4.5v7L12 20l-8-4.5z" strokeLinejoin="round" />
              <path d="M4 8.5 12 13l8-4.5M12 13v7" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="flex flex-col leading-none">
            <span translate="no">{BRAND.name}</span>
            <span className="mt-0.5 hidden text-[0.7rem] font-normal tracking-wide text-ink-faint sm:block">
              Equipment hire
            </span>
          </span>
        </Link>

        <nav aria-label="Primary" className="ml-auto hidden items-center gap-1 md:flex">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-clay-tint text-clay" : "text-ink-soft hover:bg-sunken hover:text-ink",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <ThemeToggle />
          <Link
            href="/cart"
            className="relative flex h-9 items-center gap-2 rounded-lg border border-line px-3 text-sm font-medium text-ink-soft transition-colors hover:border-clay hover:text-clay"
          >
            <ShoppingBag size={17} weight="bold" aria-hidden="true" />
            <span className="hidden sm:inline">Quote</span>
            {ready && count > 0 ? (
              <span className="tnum grid h-5 min-w-5 place-items-center rounded-full bg-clay px-1 text-xs font-semibold text-on-clay">
                {count}
              </span>
            ) : null}
          </Link>
        </div>
      </div>

      <nav
        aria-label="Primary mobile"
        className="flex items-center gap-1 overflow-x-auto border-t border-line px-4 py-2 md:hidden scrollbar-slim"
      >
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                active ? "bg-clay-tint text-clay" : "text-ink-soft",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
