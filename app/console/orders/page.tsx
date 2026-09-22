import type { Metadata } from "next";
import Link from "next/link";
import { Card, EmptyState, StatusBadge } from "@/components/ui";
import { dataset, profileById } from "@/lib/data/store";
import type { OrderStatus } from "@/lib/domain/types";
import { cn, durationLabel, fmtDateFull, money } from "@/lib/format";
import { firstParam } from "@/lib/window";

export const metadata: Metadata = { title: "Orders" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const FILTERS: { key: string; label: string; match: OrderStatus[] }[] = [
  { key: "all", label: "All", match: [] },
  { key: "quotation", label: "Quotations", match: ["quotation", "quotation_sent"] },
  { key: "confirmed", label: "Confirmed", match: ["confirmed"] },
  { key: "picked_up", label: "With customer", match: ["picked_up"] },
  { key: "returned", label: "Returned", match: ["returned"] },
  { key: "cancelled", label: "Cancelled", match: ["cancelled"] },
];

export default async function OrdersPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const requested = firstParam(params.status) ?? "all";
  const filter = FILTERS.find((f) => f.key === requested) ?? FILTERS[0];

  const orders = dataset()
    .orders.filter((order) => filter.match.length === 0 || filter.match.includes(order.status))
    .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-3xl font-semibold">Orders</h1>
        <p className="mt-1 text-ink-soft">
          Every quotation, reservation and completed hire on one list.
        </p>
      </header>

      <nav aria-label="Filter orders" className="scrollbar-slim mb-5 flex gap-2 overflow-x-auto pb-2">
        {FILTERS.map((option) => {
          const count =
            option.match.length === 0
              ? dataset().orders.length
              : dataset().orders.filter((o) => option.match.includes(o.status)).length;

          return (
            <Link
              key={option.key}
              href={option.key === "all" ? "/console/orders" : `/console/orders?status=${option.key}`}
              aria-current={option.key === filter.key ? "true" : undefined}
              className={cn(
                "whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                option.key === filter.key
                  ? "border-clay bg-clay-tint text-clay"
                  : "border-line text-ink-soft hover:border-clay hover:text-clay",
              )}
            >
              {option.label}
              <span className="tnum ml-1.5 text-xs opacity-70">{count}</span>
            </Link>
          );
        })}
      </nav>

      {orders.length === 0 ? (
        <EmptyState title="No orders here" body="Nothing matches this filter right now." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto scrollbar-slim">
            <table className="w-full min-w-[46rem] text-sm">
              <caption className="sr-only">Rental orders</caption>
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-ink-faint">
                  <th scope="col" className="px-4 py-3 font-medium">Reference</th>
                  <th scope="col" className="px-4 py-3 font-medium">Customer</th>
                  <th scope="col" className="px-4 py-3 font-medium">Window</th>
                  <th scope="col" className="px-4 py-3 font-medium">Lines</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Total</th>
                  <th scope="col" className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {orders.map((order) => {
                  const customer = profileById(order.customerId);
                  return (
                    <tr key={order.id} className="transition-colors hover:bg-sunken">
                      <td className="px-4 py-3">
                        <Link
                          href={`/console/orders/${order.id}`}
                          className="font-mono font-medium text-ink transition-colors hover:text-clay"
                        >
                          {order.reference}
                        </Link>
                        {order.lateFeeTotal > 0 ? (
                          <span className="ml-2 text-xs text-rust">
                            {money(order.lateFeeTotal)} late fee
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <span className="block truncate text-ink">{customer?.fullName}</span>
                        <span className="text-xs text-ink-faint">{customer?.city}</span>
                      </td>
                      <td className="px-4 py-3 text-ink-soft">
                        <span className="block">{fmtDateFull(order.startsAt)}</span>
                        <span className="text-xs text-ink-faint">
                          {durationLabel(order.startsAt, order.endsAt)}
                        </span>
                      </td>
                      <td className="tnum px-4 py-3 text-ink-soft">{order.lines.length}</td>
                      <td className="tnum px-4 py-3 text-right font-medium">
                        {money(order.total)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={order.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
