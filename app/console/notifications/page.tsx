import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/console/action-form";
import { ReminderRuleForm } from "@/components/console/reminder-rule-form";
import { Badge, Card, EmptyState } from "@/components/ui";
import { sendNotificationAction } from "@/lib/actions";
import { dataset, notificationRules, profileById } from "@/lib/data/store";
import { fmtDateTime, relativeTime } from "@/lib/format";

export const metadata: Metadata = { title: "Reminders" };

const EVENT_LABEL: Record<string, string> = {
  before_return: "Before the return date",
  before_pickup: "Before the pickup date",
  overdue: "Once overdue",
};

export default function NotificationsPage() {
  const store = dataset();

  const queue = store.notifications
    .slice()
    .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime());

  const pending = queue.filter((n) => !n.sentAt);
  const sent = queue.filter((n) => n.sentAt).slice(-8).reverse();

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-3xl font-semibold">Return reminders</h1>
        <p className="mt-1 max-w-3xl text-ink-soft">
          Customers and the ops team both get told before a rental is due back. Each rule carries
          its own lead time, so the desk can start preparing a collection run two days out while the
          customer hears about it three days out.
        </p>
      </header>

      <section className="mb-8">
        <h2 className="mb-3 font-display text-lg font-semibold">Rules</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {notificationRules.map((rule) => (
            <Card key={rule.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-medium text-ink">{rule.name}</h3>
                  <p className="mt-0.5 text-sm text-ink-soft">
                    {rule.audience === "customer" ? "Customer" : "Ops team"} , via {rule.channel} ,{" "}
                    {EVENT_LABEL[rule.event]}
                  </p>
                </div>
                <Badge tone={rule.isActive ? "pine" : "neutral"}>
                  {rule.isActive ? "Active" : "Paused"}
                </Badge>
              </div>

              <ReminderRuleForm
                ruleId={rule.id}
                leadDays={rule.leadDays}
                isActive={rule.isActive}
                event={rule.event}
              />
            </Card>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 font-display text-lg font-semibold">
          Queued
          <span className="tnum ml-2 text-sm font-normal text-ink-faint">{pending.length}</span>
        </h2>

        {pending.length === 0 ? (
          <EmptyState
            title="Nothing queued"
            body="Reminders appear here as soon as an order is confirmed."
          />
        ) : (
          <Card className="overflow-hidden">
            <ul className="divide-y divide-line">
              {pending.map((notification) => {
                const order = store.orders.find((o) => o.id === notification.orderId);
                const customer = order ? profileById(order.customerId) : undefined;
                const due = new Date(notification.scheduledFor).getTime() <= Date.now();

                return (
                  <li key={notification.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                    <Badge tone={notification.audience === "customer" ? "clay" : "neutral"}>
                      {notification.audience === "customer" ? "Customer" : "Ops"}
                    </Badge>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-ink">{notification.subject}</p>
                      <p className="mt-0.5 line-clamp-1 text-sm text-ink-soft">
                        {notification.body}
                      </p>
                      <p className="mt-1 text-xs text-ink-faint">
                        {order ? (
                          <Link
                            href={`/console/orders/${order.id}`}
                            className="font-mono transition-colors hover:text-clay"
                          >
                            {order.reference}
                          </Link>
                        ) : null}
                        {customer ? ` , ${customer.fullName}` : ""} , {notification.channel}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className={`text-sm ${due ? "text-ochre" : "text-ink-soft"}`}>
                        {due ? "Due now" : relativeTime(notification.scheduledFor)}
                      </p>
                      <p className="tnum text-xs text-ink-faint">
                        {fmtDateTime(notification.scheduledFor)}
                      </p>
                    </div>

                    <ActionForm
                      action={sendNotificationAction}
                      label="Send now"
                      pendingLabel="Sending…"
                      variant="secondary"
                      size="sm"
                      fields={{ notificationId: notification.id }}
                    />
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </section>

      {sent.length > 0 ? (
        <section>
          <h2 className="mb-3 font-display text-lg font-semibold">Recently sent</h2>
          <Card className="overflow-hidden">
            <ul className="divide-y divide-line">
              {sent.map((notification) => (
                <li key={notification.id} className="flex items-center gap-4 px-5 py-3">
                  <Badge tone="pine">Sent</Badge>
                  <p className="min-w-0 flex-1 truncate text-sm text-ink">
                    {notification.subject}
                  </p>
                  <p className="tnum shrink-0 text-xs text-ink-faint">
                    {notification.sentAt ? fmtDateTime(notification.sentAt) : ""}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ) : null}
    </div>
  );
}
