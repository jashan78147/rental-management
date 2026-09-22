import Link from "next/link";
import { BRAND } from "@/lib/data/seed";

const COLUMNS = [
  {
    heading: "Rent",
    links: [
      { href: "/catalog", label: "Full catalog" },
      { href: "/catalog?view=calendar", label: "Availability calendar" },
      { href: "/cart", label: "Build a quotation" },
    ],
  },
  {
    heading: "Customers",
    links: [
      { href: "/portal", label: "My rentals" },
      { href: "/portal/invoices", label: "Invoices and payments" },
      { href: "/portal/notifications", label: "Return reminders" },
    ],
  },
  {
    heading: "Operations",
    links: [
      { href: "/console", label: "Desk dashboard" },
      { href: "/console/schedule", label: "Pickup and return runs" },
      { href: "/console/pricelists", label: "Pricelists" },
      { href: "/console/reports", label: "Reports" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-sunken">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <p className="font-display text-lg font-semibold" translate="no">
              {BRAND.name}
            </p>
            <p className="mt-2 max-w-xs text-sm text-ink-soft">
              {BRAND.tagline} Quotations, reservations, collections and invoicing for a working
              rental fleet.
            </p>
            <p className="mt-4 text-sm text-ink-faint">
              Ganeshkhind Road, {BRAND.city} 411007
            </p>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.heading}>
              <h2 className="text-sm font-semibold text-ink">{column.heading}</h2>
              <ul className="mt-3 space-y-2">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-ink-soft transition-colors hover:text-clay"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-line pt-6 text-sm text-ink-faint sm:flex-row sm:items-center sm:justify-between">
          <p>
            A practice build of a rental management platform. Catalog and customers are fictional.
          </p>
          <p>Payments run through a test-mode gateway. No live charges.</p>
        </div>
      </div>
    </footer>
  );
}
