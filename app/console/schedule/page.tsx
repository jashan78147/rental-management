import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/console/action-form";
import { advanceOrderAction } from "@/lib/actions";
import { Badge, Card, EmptyState, StatusBadge } from "@/components/ui";
import { productById, profileById } from "@/lib/data/store";
import { loadDataset } from "@/lib/data/persist";
import { fmtDateFull, fmtTime, money, relativeTime } from "@/lib/format";

export const metadata: Metadata = { title: "Collections" };

const DAY_HEADING = new Intl.DateTimeFormat("en-IN", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

export default async function SchedulePage() {
  const store = await loadDataset();
  const now = Date.now();

  const movements = store.deliveries
    .filter((d) => d.status !== "cancelled")
    .filter((d) => {
      const at = new Date(d.scheduledAt).getTime();
      return at > now - 10 * 86_400_000 && at < now + 21 * 86_400_000;
    })
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  const byDay = new Map<string, typeof movements>();
  for (const movement of movements) {
    const key = movement.scheduledAt.slice(0, 10);
    byDay.set(key, [...(byDay.get(key) ?? []), movement]);
  }

  const overdueCount = movements.filter((m) => m.status === "late").length;
  const todayKey = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-3xl font-semibold">Collections and handovers</h1>
        <p className="mt-1 text-ink-soft">
          Every pickup and return document in the window, grouped by the day the crew has to move.
        </p>
        {overdueCount > 0 ? (
          <p className="mt-3 inline-flex rounded-lg bg-rust-tint px-3 py-1.5 text-sm text-rust">
            {overdueCount} return{overdueCount > 1 ? "s" : ""} past the scheduled time.
          </p>
        ) : null}
      </header>

      {byDay.size === 0 ? (
        <EmptyState
          title="Nothing scheduled"
          body="No pickups or returns fall inside the next three weeks."
        />
      ) : (
        <div className="space-y-6">
          {[...byDay.entries()].map(([day, items]) => {
            const isToday = day === todayKey;
            const isPast = day < todayKey;

            return (
              <section key={day}>
                <div className="mb-3 flex items-center gap-3">
                  <h2 className="font-display text-lg font-semibold">
                    {DAY_HEADING.format(new Date(day))}
                  </h2>
                  {isToday ? <Badge tone="clay">Today</Badge> : null}
                  <span className="tnum text-sm text-ink-faint">
                    {items.length} movement{items.length > 1 ? "s" : ""}
                  </span>
                </div>

                <Card className="overflow-hidden">
                  <ul className="divide-y divide-line">
                    {items.map((movement) => {
                      const order = store.orders.find((o) => o.id === movement.orderId);
                      const customer = order ? profileById(order.customerId) : undefined;

                      return (
                        <li
                          key={movement.id}
                          className={`flex flex-wrap items-center gap-4 px-5 py-4 ${
                            isPast && movement.status !== "done" ? "bg-rust-tint/40" : ""
                          }`}
                        >
                          <div className="w-16 shrink-0">
                            <p className="tnum font-medium">{fmtTime(movement.scheduledAt)}</p>
                          </div>

                          <Badge tone={movement.kind === "pickup" ? "clay" : "pine"}>
                            {movement.kind === "pickup" ? "Out" : "Back"}
                          </Badge>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-baseline gap-x-2">
                              <Link
                                href={`/console/orders/${movement.orderId}`}
                                className="font-mono text-sm font-medium transition-colors hover:text-clay"
                              >
                                {movement.documentNo}
                              </Link>
                              <span className="text-sm text-ink-soft">{customer?.fullName}</span>
                            </div>
                            <p className="truncate text-sm text-ink-faint">
                              {order?.lines.length ?? 0} line
                              {(order?.lines.length ?? 0) === 1 ? "" : "s"} ,{" "}
                              {order?.lines
                                .slice(0, 2)
                                .map((l) => productById(l.productId)?.name)
                                .filter(Boolean)
                                .join(", ")}
                              {(order?.lines.length ?? 0) > 2 ? " and more" : ""}
                            </p>
                            <p className="text-xs text-ink-faint">
                              {movement.address} , handled by {movement.handler}
                            </p>
                          </div>

                          <div className="flex shrink-0 items-center gap-3">
                            <div className="text-right">
                              <StatusBadge status={movement.status} />
                              {movement.status === "late" ? (
                                <p className="mt-1 text-xs text-rust">
                                  {relativeTime(movement.scheduledAt)}
                                </p>
                              ) : null}
                            </div>

                            {order && movement.status !== "done" ? (
                              movement.kind === "pickup" && order.status === "confirmed" ? (
                                <ActionForm
                                  action={advanceOrderAction}
                                  label="Hand over"
                                  pendingLabel="Saving…"
                                  variant="secondary"
                                  size="sm"
                                  fields={{ orderId: order.id, to: "picked_up" }}
                                />
                              ) : movement.kind === "return" && order.status === "picked_up" ? (
                                <ActionForm
                                  action={advanceOrderAction}
                                  label="Check in"
                                  pendingLabel="Saving…"
                                  variant="secondary"
                                  size="sm"
                                  fields={{ orderId: order.id, to: "returned" }}
                                />
                              ) : null
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </Card>
              </section>
            );
          })}
        </div>
      )}

      <Card className="mt-8 p-5">
        <h2 className="font-display font-semibold">How a movement is priced</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Checking in a return after its scheduled time raises a late fee invoice against the rule
          that matches the order&rsquo;s category. Grace hours are forgiven in full, the remainder
          rounds up to a day, and each rule carries its own cap. Current standard rate is{" "}
          {money(1200)} per day after a four hour grace.
        </p>
        <p className="mt-2 text-sm text-ink-faint">
          Returned {fmtDateFull(new Date().toISOString())} or later still counts against the
          original due time, not the check-in time.
        </p>
      </Card>
    </div>
  );
}
