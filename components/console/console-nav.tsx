"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BellRinging,
  ChartBar,
  ClipboardText,
  CurrencyInr,
  Gauge,
  Package,
  Tag,
  Truck,
} from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/format";

const LINKS = [
  { href: "/console", label: "Dashboard", icon: Gauge },
  { href: "/console/orders", label: "Orders", icon: ClipboardText },
  { href: "/console/schedule", label: "Collections", icon: Truck },
  { href: "/console/products", label: "Fleet", icon: Package },
  { href: "/console/pricelists", label: "Pricelists", icon: Tag },
  { href: "/console/invoices", label: "Invoicing", icon: CurrencyInr },
  { href: "/console/notifications", label: "Reminders", icon: BellRinging },
  { href: "/console/reports", label: "Reports", icon: ChartBar },
];

export function ConsoleNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Operations"
      className="scrollbar-slim mb-6 flex gap-1 overflow-x-auto pb-2 lg:mb-0 lg:sticky lg:top-24 lg:h-fit lg:flex-col lg:overflow-visible lg:pb-0"
    >
      {LINKS.map((link) => {
        const active =
          link.href === "/console"
            ? pathname === "/console"
            : pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-clay-tint text-clay"
                : "text-ink-soft hover:bg-sunken hover:text-ink",
            )}
          >
            <link.icon size={17} weight={active ? "fill" : "regular"} aria-hidden="true" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
