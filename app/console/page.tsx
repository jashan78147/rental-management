import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { OperatorBrief, OperatorBriefSkeleton } from "@/components/console/operator-brief";
import { ActionForm } from "@/components/console/action-form";
import { RevenueTrendChart } from "@/components/console/report-charts";
import { ProductThumb } from "@/components/product-thumb";
import { Badge, Card, EmptyState, Stat, StatusBadge } from "@/components/ui";
import { resetDemoAction } from "@/lib/actions";
import { dbConfigured } from "@/lib/db/client";
import { allProducts, lateFeeRules, profileById } from "@/lib/data/store";
import { products as productSeeds } from "@/lib/data/seed";
import { loadDataset } from "@/lib/data/persist";
import { availableUnits } from "@/lib/domain/availability";
import { returnRisk } from "@/lib/domain/fees";
import { compareHeadline, PERIODS, revenueTrend, type PeriodKey } from "@/lib/domain/reports";
import { fmtDate, money, moneyCompact, relativeTime } from "@/lib/format";
import { firstParam } from "@/lib/window";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ConsoleDashboard({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const period = (PERIODS.find((p) => p.key === firstParam(params.period))?.key ??
    "90d") as PeriodKey;

  const store = await loadDataset();
  const comparison = compareHeadline(store, period);
  const stats = comparison.current;
  const trend = revenueTrend(store, period);
  const risks = returnRisk(store.orders, lateFeeRules, store.products);

  const now = new Date();
  const weekOut = new Date(now.getTime() + 7 * 86_400_000);

  // What the desk could still sell this week, tightest first.
  const availability = allProducts
    .map((product) => ({
      product,
      free: availableUnits(product, store.reservations, now.toISOString(), weekOut.toISOString()),
      dayRate: productSeeds.find((p) => p.id === product.id)?.rates.day ?? 0,
    }))
    .sort((a, b) => a.free / a.product.totalUnits - b.free / b.product.totalUnits)
    .slice(0, 5);

  const recent = store.orders
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Operations desk</h1>
          <p className="mt-1 text-ink-soft">
            What is out, what is late and what is waiting on a signature.
          </p>
        </div>

        <nav aria-label="Reporting period" className="flex rounded-lg border border-line p-0.5">
          {PERIODS.map((option) => (
            <Link
              key={option.key}
              href={`/console?period=${option.key}`}
              aria-current={option.key === period ? "true" : undefined}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                option.key === period ? "bg-clay text-on-clay" : "text-ink-soft hover:text-ink"
              }`}
            >
              {option.label.replace("Last ", "")}
            </Link>
          ))}
        </nav>
      </header>

      {/* Headline numbers -------------------------------------------------- */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          filled
          label="Booked revenue"
          value={moneyCompact(stats.revenue)}
          hint={`${stats.bookedOrders} orders confirmed or out`}
          change={comparison.revenueChange}
        />
        <Stat
          label="Open quotations"
          value={moneyCompact(stats.quotationValue)}
          hint={`${stats.quotationCount} awaiting confirmation`}
          tone="ochre"
          change={comparison.quotationChange}
        />
        <Stat
          label="Units on hire"
          value={String(stats.unitsOnHire)}
          hint={`${stats.utilisation}% of the fleet that moved`}
          tone="clay"
          change={comparison.ordersChange}
        />
        <Stat
          label="Returned on time"
          value={`${stats.onTimeRate}%`}
          hint={`${money(stats.lateFees)} billed in late fees`}
          tone={stats.onTimeRate >= 90 ? "pine" : "rust"}
        />
      </div>

      {/* Trend plus what is still sellable ---------------------------------- */}
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.55fr_1fr] xl:items-start">
        <Card className="p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold">Revenue over the period</h2>
              <p className="mt-1 text-sm text-ink-soft">
                Confirmed, out and returned orders, bucketed by pickup date.
              </p>
            </div>
            <Link
              href={`/console/reports?period=${period}`}
              className="inline-flex items-center gap-1 text-sm text-clay transition-colors hover:text-clay-hover"
            >
              Full reports
              <ArrowRight size={14} weight="bold" aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-4">
            <RevenueTrendChart data={trend} />
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <h2 className="font-display font-semibold">Tightest stock this week</h2>
            <Link
              href="/console/products"
              className="inline-flex items-center gap-1 text-sm text-clay transition-colors hover:text-clay-hover"
            >
              Fleet
              <ArrowRight size={14} weight="bold" aria-hidden="true" />
            </Link>
          </div>

          <ul className="divide-y divide-line">
            {availability.map(({ product, free, dayRate }) => (
              <li key={product.id} className="flex items-center gap-3 px-5 py-3">
                <ProductThumb productId={product.id} size="sm" />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/catalog/${product.slug}`}
                    className="block truncate font-medium text-ink transition-colors hover:text-clay"
                  >
                    {product.name}
                  </Link>
                  <p className="tnum text-sm text-ink-faint">{money(dayRate)} a day</p>
                </div>
                <Badge tone={free === 0 ? "rust" : free <= 2 ? "ochre" : "pine"}>
                  {free === 0 ? "Fully booked" : `${free} of ${product.totalUnits} free`}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Brief plus return risk --------------------------------------------- */}
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.15fr_1fr] xl:items-start">
        <Suspense fallback={<OperatorBriefSkeleton />}>
          <OperatorBrief store={store} period={period} />
        </Suspense>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <h2 className="font-display font-semibold">Return risk</h2>
            <Link
              href="/console/schedule"
              className="inline-flex items-center gap-1 text-sm text-clay transition-colors hover:text-clay-hover"
            >
              Collections
              <ArrowRight size={14} weight="bold" aria-hidden="true" />
            </Link>
          </div>

          {risks.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-ink-soft">
              Nothing overdue and nothing due in the next 48 hours.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {risks.slice(0, 6).map((risk) => {
                const order = store.orders.find((o) => o.id === risk.orderId);
                return (
                  <li key={risk.orderId} className="flex items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/console/orders/${risk.orderId}`}
                        className="font-mono text-sm font-medium text-ink transition-colors hover:text-clay"
                      >
                        {risk.reference}
                      </Link>
                      <p className="truncate text-sm text-ink-soft">
                        {order ? profileById(order.customerId)?.fullName : "Unknown customer"}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge tone={risk.risk === "overdue" ? "rust" : "ochre"}>
                        {risk.risk === "overdue" ? "Overdue" : "Due soon"}
                      </Badge>
                      <p className="tnum mt-1 text-xs text-ink-faint">
                        {order ? relativeTime(order.endsAt) : ""}
                        {risk.projectedFee > 0 ? `, ${money(risk.projectedFee)} fees` : ""}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {/* Recent bookings ----------------------------------------------------- */}
      <Card className="mt-4 overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="font-display font-semibold">Latest bookings</h2>
          <Link
            href="/console/orders"
            className="inline-flex items-center gap-1 text-sm text-clay transition-colors hover:text-clay-hover"
          >
            All orders
            <ArrowRight size={14} weight="bold" aria-hidden="true" />
          </Link>
        </div>

        {recent.length === 0 ? (
          <EmptyState title="No bookings yet" body="Quotations will appear here as they come in." />
        ) : (
          <div className="overflow-x-auto scrollbar-slim">
            <table className="w-full min-w-[46rem] text-sm">
              <caption className="sr-only">Most recent rental orders</caption>
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-ink-faint">
                  <th scope="col" className="px-5 py-3 font-medium">Reference</th>
                  <th scope="col" className="px-4 py-3 font-medium">Customer</th>
                  <th scope="col" className="px-4 py-3 font-medium">Status</th>
                  <th scope="col" className="px-4 py-3 font-medium">Out</th>
                  <th scope="col" className="px-4 py-3 font-medium">Back</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Value</th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">
                    <span className="sr-only">Open</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {recent.map((order) => (
                  <tr key={order.id} className="transition-colors hover:bg-sunken">
                    <td className="px-5 py-3 font-mono font-medium">{order.reference}</td>
                    <td className="px-4 py-3 text-ink-soft">
                      {profileById(order.customerId)?.fullName}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="tnum px-4 py-3 text-ink-soft">{fmtDate(order.startsAt)}</td>
                    <td className="tnum px-4 py-3 text-ink-soft">{fmtDate(order.endsAt)}</td>
                    <td className="tnum px-4 py-3 text-right font-medium">{money(order.total)}</td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/console/orders/${order.id}`}
                        className="inline-flex h-8 items-center rounded-lg bg-clay px-3 text-xs font-medium text-on-clay transition-colors hover:bg-clay-hover"
                      >
                        Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="mt-4 flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <h2 className="font-display font-semibold">Demo data</h2>
          <p className="mt-1 max-w-2xl text-sm text-ink-soft">
            {dbConfigured()
              ? "Restore every order, reservation, invoice and reminder to its seeded state, so the same walkthrough can be run twice. Nothing here is real customer data."
              : "No database is attached, so this instance is running on an in-process copy of the seed. Restart the dev server to reset it."}
          </p>
        </div>
        {dbConfigured() ? (
          <ActionForm
            action={resetDemoAction}
            label="Reset demo data"
            pendingLabel="Restoring…"
            variant="secondary"
            confirm="Restore all demo data to its seeded state? Any orders you created will be removed."
            fields={{}}
          />
        ) : null}
      </Card>
    </div>
  );
}
