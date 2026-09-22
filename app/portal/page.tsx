import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { CustomerSwitch } from "@/components/portal/customer-switch";
import { Badge, ButtonLink, Card, EmptyState, Stat, StatusBadge } from "@/components/ui";
import { profiles } from "@/lib/data/seed";
import { profileById } from "@/lib/data/store";
import { loadDataset } from "@/lib/data/persist";
import { durationLabel, fmtDateTime, money, relativeTime } from "@/lib/format";
import { firstParam } from "@/lib/window";

export const metadata: Metadata = { title: "My Rentals" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const CUSTOMERS = profiles.filter((p) => p.role === "customer");

export default async function PortalPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const customerId = firstParam(params.as) ?? CUSTOMERS[0].id;
  const customer = profileById(customerId) ?? CUSTOMERS[0];

  const store = await loadDataset();
  const orders = store.orders
    .filter((o) => o.customerId === customer.id)
    .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());

  const active = orders.filter((o) => o.status === "confirmed" || o.status === "picked_up");
  const awaiting = orders.filter((o) => o.status === "quotation" || o.status === "quotation_sent");
  const past = orders.filter((o) => o.status === "returned" || o.status === "cancelled");

  const orderIds = new Set(orders.map((o) => o.id));
  const outstanding = store.invoices
    .filter((i) => orderIds.has(i.orderId) && (i.status === "sent" || i.status === "draft"))
    .reduce((sum, i) => sum + i.amount, 0);
  const lifetime = orders
    .filter((o) => o.status !== "cancelled" && o.status !== "quotation")
    .reduce((sum, o) => sum + o.total, 0);

  const reminders = store.notifications
    .filter((n) => orderIds.has(n.orderId) && n.audience === "customer")
    .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime())
    .slice(0, 4);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">My rentals</h1>
          <p className="mt-1 text-ink-soft">
            {customer.fullName} , {customer.email}
          </p>
        </div>
        <CustomerSwitch customers={CUSTOMERS} currentId={customer.id} />
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Out with you now" value={String(active.length)} hint="Confirmed or collected" tone="clay" />
        <Stat
          label="Awaiting your confirmation"
          value={String(awaiting.length)}
          hint={awaiting.length > 0 ? "Review and pay to reserve" : "Nothing pending"}
          tone={awaiting.length > 0 ? "ochre" : "neutral"}
        />
        <Stat
          label="Outstanding balance"
          value={money(outstanding)}
          hint={`${money(lifetime)} booked with us in total`}
          tone={outstanding > 0 ? "rust" : "pine"}
        />
      </div>

      {reminders.length > 0 ? (
        <Card className="mt-6 overflow-hidden">
          <div className="border-b border-line px-5 py-3.5">
            <h2 className="font-display font-semibold">Return reminders</h2>
          </div>
          <ul className="divide-y divide-line">
            {reminders.map((reminder) => (
              <li key={reminder.id} className="flex items-center gap-4 px-5 py-3">
                <Badge tone={reminder.sentAt ? "pine" : "neutral"}>
                  {reminder.sentAt ? "Sent" : "Queued"}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{reminder.subject}</p>
                  <p className="text-xs text-ink-faint">
                    via {reminder.channel} , {relativeTime(reminder.scheduledFor)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {orders.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No rentals yet"
            body="Browse the catalog and build a quotation. Nothing is reserved until you confirm it."
            action={
              <ButtonLink href="/catalog" className="mt-2">
                Browse the catalog
              </ButtonLink>
            }
          />
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          {[
            { heading: "Needs your attention", rows: awaiting },
            { heading: "Active rentals", rows: active },
            { heading: "Past rentals", rows: past },
          ]
            .filter((group) => group.rows.length > 0)
            .map((group) => (
              <section key={group.heading}>
                <h2 className="mb-3 font-display text-lg font-semibold">{group.heading}</h2>
                <ul className="space-y-3">
                  {group.rows.map((order) => (
                    <li key={order.id}>
                      <Card className="flex flex-wrap items-center gap-4 p-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/portal/orders/${order.id}?as=${customer.id}`}
                              className="font-mono font-medium text-ink transition-colors hover:text-clay"
                            >
                              {order.reference}
                            </Link>
                            <StatusBadge status={order.status} />
                            {order.lateFeeTotal > 0 ? (
                              <Badge tone="rust">{money(order.lateFeeTotal)} late fee</Badge>
                            ) : null}
                          </div>
                          <p className="mt-1 text-sm text-ink-soft">
                            {fmtDateTime(order.startsAt)} to {fmtDateTime(order.endsAt)} ,{" "}
                            {durationLabel(order.startsAt, order.endsAt)}
                          </p>
                          <p className="mt-0.5 text-sm text-ink-faint">
                            {order.lines.length} line{order.lines.length === 1 ? "" : "s"}
                            {order.status === "picked_up"
                              ? ` , due back ${relativeTime(order.endsAt)}`
                              : ""}
                          </p>
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="tnum font-display text-lg font-semibold">
                            {money(order.total)}
                          </p>
                          <Link
                            href={`/portal/orders/${order.id}?as=${customer.id}`}
                            className="mt-1 inline-flex items-center gap-1 text-sm text-clay transition-colors hover:text-clay-hover"
                          >
                            {order.status === "quotation_sent" ? "Review and pay" : "View"}
                            <ArrowRight size={14} weight="bold" aria-hidden="true" />
                          </Link>
                        </div>
                      </Card>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
        </div>
      )}
    </div>
  );
}
