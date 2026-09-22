"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Moon, ShoppingBag, Sun } from "@phosphor-icons/react/dist/ssr";
import { useCart } from "@/components/cart-provider";
import { BrandMark } from "@/components/brand-mark";
import { cn } from "@/lib/format";

/**
 * The desk and the portal are two sides of one counter, and nobody belongs on
 * both. Showing a customer a link that only redirects them back is noise, so
 * the nav follows the signed-in role: signed out sees the shop alone.
 */
function navFor(role: "operator" | "customer" | null) {
  const nav = [{ href: "/catalog", label: "Catalog" }];
  if (role === "operator") nav.push({ href: "/console", label: "Operations" });
  else if (role === "customer") nav.push({ href: "/portal", label: "My Rentals" });
  return nav;
}

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

/** Routes that own the whole viewport and supply their own branding. */
const BARE_ROUTES = ["/login", "/register"];

export function SiteHeader({
  accountSlot,
  role = null,
}: {
  accountSlot?: ReactNode;
  role?: "operator" | "customer" | null;
}) {
  const pathname = usePathname();
  const { count, ready } = useCart();

  if (BARE_ROUTES.some((route) => pathname.startsWith(route))) return null;

  const nav = navFor(role);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-sticky backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="shrink-0">
          <BrandMark />
        </Link>

        <nav aria-label="Primary" className="ml-auto hidden items-center gap-1 md:flex">
          {nav.map((item) => {
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
          {accountSlot}
        </div>
      </div>

      <nav
        aria-label="Primary mobile"
        className="flex items-center gap-1 overflow-x-auto border-t border-line px-4 py-2 md:hidden scrollbar-slim"
      >
        {nav.map((item) => {
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
