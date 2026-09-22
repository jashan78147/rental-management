import type { Metadata } from "next";
import Link from "next/link";
import { CustomerSwitch } from "@/components/portal/customer-switch";
import { Badge, Card, EmptyState } from "@/components/ui";
import { profiles } from "@/lib/data/seed";
import { profileById } from "@/lib/data/store";
import { loadDataset } from "@/lib/data/persist";
import { fmtDateTime, relativeTime } from "@/lib/format";
import { firstParam } from "@/lib/window";

export const metadata: Metadata = { title: "Reminders" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const CUSTOMERS = profiles.filter((p) => p.role === "customer");

export default async function PortalNotificationsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const customerId = firstParam(params.as) ?? CUSTOMERS[0].id;
  const customer = profileById(customerId) ?? CUSTOMERS[0];

  const store = await loadDataset();
  const notificationRules = store.notificationRules;
  const orderIds = new Set(
    store.orders.filter((o) => o.customerId === customer.id).map((o) => o.id),
  );

  const notifications = store.notifications
    .filter((n) => orderIds.has(n.orderId) && n.audience === "customer")
    .sort((a, b) => new Date(b.scheduledFor).getTime() - new Date(a.scheduledFor).getTime());

  const customerRules = notificationRules.filter((r) => r.audience === "customer" && r.isActive);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Return reminders</h1>
          <p className="mt-1 text-ink-soft">{customer.fullName}</p>
        </div>
        <CustomerSwitch customers={CUSTOMERS} currentId={customer.id} />
      </header>

      <Card className="p-5">
        <h2 className="font-display font-semibold">When we will contact you</h2>
        <ul className="mt-3 space-y-2">
          {customerRules.map((rule) => (
            <li key={rule.id} className="flex flex-wrap items-center gap-2 text-sm">
              <Badge tone="clay">{rule.channel}</Badge>
              <span className="text-ink">
                {rule.leadDays} day{rule.leadDays === 1 ? "" : "s"} before your return date
              </span>
              <span className="text-ink-faint">, {rule.name}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-ink-faint">
          Lead times are set by the rental desk and apply to every open booking, including ones
          already confirmed.
        </p>
      </Card>

      <h2 className="mb-3 mt-8 font-display text-lg font-semibold">Your reminders</h2>

      {notifications.length === 0 ? (
        <EmptyState
          title="Nothing scheduled"
          body="Reminders are queued as soon as you confirm a booking."
        />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-line">
            {notifications.map((notification) => {
              const order = store.orders.find((o) => o.id === notification.orderId);
              return (
                <li key={notification.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-ink">{notification.subject}</p>
                      <p className="mt-1 text-sm text-ink-soft">{notification.body}</p>
                      <p className="mt-1.5 text-xs text-ink-faint">
                        {order ? (
                          <Link
                            href={`/portal/orders/${order.id}?as=${customer.id}`}
                            className="font-mono transition-colors hover:text-clay"
                          >
                            {order.reference}
                          </Link>
                        ) : null}
                        {" , "}
                        {notification.sentAt
                          ? `sent ${fmtDateTime(notification.sentAt)}`
                          : `scheduled ${relativeTime(notification.scheduledFor)}`}
                      </p>
                    </div>
                    <Badge tone={notification.sentAt ? "pine" : "neutral"}>
                      {notification.sentAt ? "Sent" : "Queued"}
                    </Badge>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
