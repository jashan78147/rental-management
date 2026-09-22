import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { OperatorBrief, OperatorBriefSkeleton } from "@/components/console/operator-brief";
import { Badge, Card, EmptyState, Stat, StatusBadge } from "@/components/ui";
import { dataset, lateFeeRules, profileById } from "@/lib/data/store";
import { returnRisk } from "@/lib/domain/fees";
import { headline, PERIODS, type PeriodKey } from "@/lib/domain/reports";
import { fmtDateTime, money, moneyCompact, relativeTime } from "@/lib/format";
import { firstParam } from "@/lib/window";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ConsoleDashboard({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const period = (PERIODS.find((p) => p.key === firstParam(params.period))?.key ??
    "90d") as PeriodKey;

  const stats = headline(period);
  const store = dataset();
  const risks = returnRisk(store.orders, lateFeeRules, store.products);

  const now = Date.now();
  const upcoming = store.deliveries
    .filter((d) => d.status === "scheduled" || d.status === "ready")
    .filter((d) => new Date(d.scheduledAt).getTime() < now + 7 * 86_400_000)
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    .slice(0, 6);

  const openQuotes = store.orders
    .filter((o) => o.status === "quotation" || o.status === "quotation_sent")
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Booked revenue"
          value={moneyCompact(stats.revenue)}
          hint={`${stats.bookedOrders} orders`}
        />
        <Stat
          label="Open quotations"
          value={moneyCompact(stats.quotationValue)}
          hint={`${stats.quotationCount} awaiting confirmation`}
          tone="ochre"
        />
        <Stat
          label="Units on hire"
          value={String(stats.unitsOnHire)}
          hint={`${stats.utilisation}% of the fleet that moved`}
          tone="clay"
        />
        <Stat
          label="Returned on time"
          value={`${stats.onTimeRate}%`}
          hint={`${money(stats.lateFees)} billed in late fees`}
          tone={stats.onTimeRate >= 90 ? "pine" : "rust"}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_1fr] xl:items-start">
        <Suspense fallback={<OperatorBriefSkeleton />}>
          <OperatorBrief period={period} />
        </Suspense>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <h2 className="font-display font-semibold">Return risk</h2>
            <Link
              href="/console/schedule"
              className="inline-flex items-center gap-1 text-sm text-clay hover:text-clay-hover"
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
                        {risk.projectedFee > 0 ? ` , ${money(risk.projectedFee)} fees` : ""}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2 xl:items-start">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <h2 className="font-display font-semibold">Next seven days</h2>
            <span className="text-sm text-ink-faint">Pickups and returns</span>
          </div>

          {upcoming.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-ink-soft">
              No movements scheduled this week.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {upcoming.map((delivery) => {
                const order = store.orders.find((o) => o.id === delivery.orderId);
                return (
                  <li key={delivery.id} className="flex items-center gap-3 px-5 py-3">
                    <Badge tone={delivery.kind === "pickup" ? "clay" : "pine"}>
                      {delivery.kind === "pickup" ? "Out" : "Back"}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/console/orders/${delivery.orderId}`}
                        className="font-mono text-sm font-medium transition-colors hover:text-clay"
                      >
                        {delivery.documentNo}
                      </Link>
                      <p className="truncate text-sm text-ink-soft">
                        {order ? profileById(order.customerId)?.fullName : ""} , {delivery.address}
                      </p>
                    </div>
                    <p className="tnum shrink-0 text-right text-sm text-ink-soft">
                      {fmtDateTime(delivery.scheduledAt)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <h2 className="font-display font-semibold">Quotations to chase</h2>
            <Link
              href="/console/orders?status=quotation_sent"
              className="inline-flex items-center gap-1 text-sm text-clay hover:text-clay-hover"
            >
              All orders
              <ArrowRight size={14} weight="bold" aria-hidden="true" />
            </Link>
          </div>

          {openQuotes.length === 0 ? (
            <EmptyState title="Nothing open" body="Every quotation has been confirmed or closed." />
          ) : (
            <ul className="divide-y divide-line">
              {openQuotes.slice(0, 6).map((order) => (
                <li key={order.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/console/orders/${order.id}`}
                      className="font-mono text-sm font-medium transition-colors hover:text-clay"
                    >
                      {order.reference}
                    </Link>
                    <p className="truncate text-sm text-ink-soft">
                      {profileById(order.customerId)?.fullName} , starts{" "}
                      {relativeTime(order.startsAt)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="tnum font-medium">{money(order.total)}</p>
                    <StatusBadge status={order.status} />
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
