import type { Metadata } from "next";
import Link from "next/link";
import { DownloadSimple } from "@phosphor-icons/react/dist/ssr";
import {
  CategoryMixChart,
  RevenueTrendChart,
  TopProductsChart,
} from "@/components/console/report-charts";
import { Badge, Card, EmptyState, Stat } from "@/components/ui";
import { PERIODS, reportBundle, type PeriodKey } from "@/lib/domain/reports";
import { loadDataset } from "@/lib/data/persist";
import { SEGMENT_LABEL } from "@/lib/data/seed";
import type { CustomerSegment } from "@/lib/domain/types";
import { fmtDateTime, money, moneyCompact } from "@/lib/format";
import { firstParam } from "@/lib/window";

export const metadata: Metadata = { title: "Reports" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const FORMATS = [
  { key: "pdf", label: "PDF" },
  { key: "xlsx", label: "XLSX" },
  { key: "csv", label: "CSV" },
];

export default async function ReportsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const period = (PERIODS.find((p) => p.key === firstParam(params.period))?.key ??
    "90d") as PeriodKey;

  const bundle = reportBundle(await loadDataset(), period);
  const h = bundle.headline;

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Reports</h1>
          <p className="mt-1 text-ink-soft">
            {bundle.period.label}, ending {fmtDateTime(new Date().toISOString())}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <nav aria-label="Reporting period" className="flex rounded-lg border border-line p-0.5">
            {PERIODS.map((option) => (
              <Link
                key={option.key}
                href={`/console/reports?period=${option.key}`}
                aria-current={option.key === period ? "true" : undefined}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  option.key === period ? "bg-clay text-on-clay" : "text-ink-soft hover:text-ink"
                }`}
              >
                {option.label.replace("Last ", "")}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <span className="text-sm text-ink-faint">Export</span>
            {FORMATS.map((format) => (
              <a
                key={format.key}
                href={`/api/reports/export?format=${format.key}&period=${period}`}
                download
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong px-3 text-sm font-medium text-ink transition-colors hover:border-clay hover:text-clay"
              >
                <DownloadSimple size={15} weight="bold" aria-hidden="true" />
                {format.label}
              </a>
            ))}
          </div>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Total rental revenue"
          value={moneyCompact(h.revenue)}
          hint={`${h.bookedOrders} booked orders`}
          tone="clay"
        />
        <Stat
          label="Quote to order"
          value={`${h.conversionRate}%`}
          hint={`${h.quotationCount} still open, ${moneyCompact(h.quotationValue)}`}
        />
        <Stat
          label="Returned on time"
          value={`${h.onTimeRate}%`}
          hint={`${bundle.late.length} late in period`}
          tone={h.onTimeRate >= 90 ? "pine" : "rust"}
        />
        <Stat
          label="Late fees billed"
          value={money(h.lateFees)}
          hint="Against the configured rules"
          tone={h.lateFees > 0 ? "ochre" : "neutral"}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_1fr] xl:items-start">
        <Card className="p-5">
          <h2 className="font-display text-lg font-semibold">Rental revenue over the period</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Confirmed, out and returned orders, bucketed by pickup date.
          </p>
          <div className="mt-4">
            <RevenueTrendChart data={bundle.trend} />
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="font-display text-lg font-semibold">Where the revenue comes from</h2>
          <p className="mt-1 text-sm text-ink-soft">Category share of line revenue.</p>
          <div className="mt-4">
            <CategoryMixChart data={bundle.categories} />
          </div>
        </Card>
      </div>

      <Card className="mt-6 p-5">
        <h2 className="font-display text-lg font-semibold">Most rented products</h2>
        <p className="mt-1 text-sm text-ink-soft">Ranked by revenue, not by unit count.</p>
        <div className="mt-4">
          <TopProductsChart data={bundle.products} />
        </div>

        <div className="mt-6 overflow-x-auto scrollbar-slim">
          <table className="w-full min-w-[40rem] text-sm">
            <caption className="sr-only">Most rented products</caption>
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-ink-faint">
                <th scope="col" className="px-3 py-2.5 font-medium">Product</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Category</th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">Orders</th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">Units out</th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">Revenue</th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">Utilisation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {bundle.products.map((product) => (
                <tr key={product.productId} className="transition-colors hover:bg-sunken">
                  <td className="px-3 py-2.5 font-medium text-ink">{product.name}</td>
                  <td className="px-3 py-2.5 text-ink-soft">{product.category}</td>
                  <td className="tnum px-3 py-2.5 text-right">{product.timesRented}</td>
                  <td className="tnum px-3 py-2.5 text-right">{product.unitsOut}</td>
                  <td className="tnum px-3 py-2.5 text-right font-medium">
                    {money(product.revenue)}
                  </td>
                  <td className="tnum px-3 py-2.5 text-right text-ink-soft">
                    {product.utilisation}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-6 grid gap-6 xl:grid-cols-2 xl:items-start">
        <Card className="overflow-hidden">
          <div className="border-b border-line px-5 py-3.5">
            <h2 className="font-display font-semibold">Top customers</h2>
          </div>
          <ul className="divide-y divide-line">
            {bundle.customers.map((customer, index) => (
              <li key={customer.customerId} className="flex items-center gap-4 px-5 py-3">
                <span className="tnum w-5 shrink-0 text-sm text-ink-faint">{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">{customer.name}</p>
                  <p className="text-sm text-ink-soft">
                    {SEGMENT_LABEL[customer.segment as CustomerSegment] ?? customer.segment}
                    {customer.city ? ` , ${customer.city}` : ""} , {customer.orders} orders
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="tnum font-medium">{money(customer.revenue)}</p>
                  {customer.lateReturns > 0 ? (
                    <Badge tone="rust">{customer.lateReturns} late</Badge>
                  ) : (
                    <Badge tone="pine">On time</Badge>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-line px-5 py-3.5">
            <h2 className="font-display font-semibold">Late returns</h2>
          </div>

          {bundle.late.length === 0 ? (
            <EmptyState
              title="Everything came back on time"
              body="No return in this period ran past its scheduled slot."
            />
          ) : (
            <ul className="divide-y divide-line">
              {bundle.late.map((row) => (
                <li key={row.reference} className="flex items-center gap-4 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm font-medium">{row.reference}</p>
                    <p className="truncate text-sm text-ink-soft">{row.customer}</p>
                    <p className="text-xs text-ink-faint">Due {fmtDateTime(row.dueAt)}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="tnum text-sm text-rust">
                      {row.hoursLate < 48
                        ? `${Math.round(row.hoursLate)}h late`
                        : `${Math.round(row.hoursLate / 24)}d late`}
                    </p>
                    <p className="tnum text-sm font-medium">{money(row.fee)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
