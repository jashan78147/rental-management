import type { Metadata } from "next";
import { ProductThumb } from "@/components/product-thumb";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { ActionForm } from "@/components/console/action-form";
import { Badge, Card, StatusBadge, INVOICE_KIND_LABEL } from "@/components/ui";
import {
  advanceOrderAction,
  confirmOrderAction,
  payInvoiceAction,
  sendNotificationAction,
} from "@/lib/actions";
import { lateFeeRules, pricelists, productById, profileById } from "@/lib/data/store";
import { loadDataset } from "@/lib/data/persist";
import { assessLateFee } from "@/lib/domain/fees";
import { UNIT_LABEL } from "@/lib/domain/pricing";
import { SEGMENT_LABEL } from "@/lib/data/seed";
import { durationLabel, fmtDateTime, fmtDateFull, money, relativeTime } from "@/lib/format";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const store = await loadDataset();
  const order = store.orders.find((o) => o.id === id);
  return { title: order ? order.reference : "Order" };
}

export default async function ConsoleOrderPage({ params }: { params: Params }) {
  const { id } = await params;
  const store = await loadDataset();
  const order = store.orders.find((o) => o.id === id);
  if (!order) notFound();

  const customer = profileById(order.customerId);
  const pricelist = pricelists.find((p) => p.id === order.pricelistId);
  const deliveries = store.deliveries.filter((d) => d.orderId === order.id);
  const invoices = store.invoices.filter((i) => i.orderId === order.id);
  const notifications = store.notifications
    .filter((n) => n.orderId === order.id)
    .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime());

  const overdue =
    (order.status === "picked_up" || order.status === "confirmed") &&
    new Date(order.endsAt).getTime() < Date.now();
  const projected = overdue
    ? assessLateFee(order, lateFeeRules, store.products, new Date())
    : null;

  const outstanding = invoices
    .filter((i) => i.status !== "paid" && i.status !== "void")
    .reduce((sum, i) => sum + i.amount, 0);

  return (
    <div>
      <Link
        href="/console/orders"
        className="inline-flex items-center gap-1.5 text-sm text-ink-soft transition-colors hover:text-clay"
      >
        <ArrowLeft size={15} weight="bold" aria-hidden="true" />
        All orders
      </Link>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-mono text-2xl font-semibold">{order.reference}</h1>
            <StatusBadge status={order.status} />
            {overdue ? <Badge tone="rust">Overdue</Badge> : null}
          </div>
          <p className="mt-2 text-ink-soft">
            {customer?.fullName} , {customer?.email} , {customer?.city}
          </p>
          <p className="mt-1 text-sm text-ink-faint">
            {fmtDateTime(order.startsAt)} to {fmtDateTime(order.endsAt)} ,{" "}
            {durationLabel(order.startsAt, order.endsAt)}
          </p>
        </div>

        <div className="flex flex-wrap items-start gap-3">
          {order.status === "quotation" ? (
            <ActionForm
              action={advanceOrderAction}
              label="Send to customer"
              pendingLabel="Sending…"
              variant="secondary"
              fields={{ orderId: order.id, to: "quotation_sent" }}
            />
          ) : null}

          {order.status === "quotation" || order.status === "quotation_sent" ? (
            <>
              <ActionForm
                action={confirmOrderAction}
                label="Confirm and reserve"
                pendingLabel="Reserving…"
                fields={{ orderId: order.id, invoiceMode: "deposit_then_balance" }}
              />
              <ActionForm
                action={advanceOrderAction}
                label="Cancel"
                pendingLabel="Cancelling…"
                variant="danger"
                confirm="Cancel this order and release the reserved stock?"
                fields={{ orderId: order.id, to: "cancelled" }}
              />
            </>
          ) : null}

          {order.status === "confirmed" ? (
            <ActionForm
              action={advanceOrderAction}
              label="Mark picked up"
              pendingLabel="Handing over…"
              fields={{ orderId: order.id, to: "picked_up" }}
            />
          ) : null}

          {order.status === "picked_up" ? (
            <ActionForm
              action={advanceOrderAction}
              label="Check in return"
              pendingLabel="Checking in…"
              fields={{ orderId: order.id, to: "returned" }}
            />
          ) : null}
        </div>
      </header>

      {projected ? (
        <Card className="mt-6 border-rust/30 bg-rust-tint p-4">
          <h2 className="font-display font-semibold text-rust">Late return accruing</h2>
          <p className="mt-1 text-sm text-rust">
            {projected.hoursLate} hours past due under &ldquo;{projected.ruleName}&rdquo;, billing{" "}
            {projected.daysCharged} day{projected.daysCharged > 1 ? "s" : ""} at{" "}
            {money(projected.amount)}
            {projected.capped ? " (capped)" : ""}. Checking in the return raises this as its own
            invoice.
          </p>
        </Card>
      ) : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr] xl:items-start">
        <div className="space-y-6">
          {/* Lines --------------------------------------------------------- */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
              <h2 className="font-display font-semibold">Order lines</h2>
              {pricelist ? (
                <span className="text-sm text-ink-faint">
                  {pricelist.name}
                  {customer ? ` , ${SEGMENT_LABEL[customer.segment]}` : ""}
                </span>
              ) : null}
            </div>

            <ul className="divide-y divide-line">
              {order.lines.map((line) => {
                const product = productById(line.productId);
                return (
                  <li key={line.id} className="flex gap-4 px-5 py-4">
                    <ProductThumb productId={line.productId} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <Link
                          href={product ? `/catalog/${product.slug}` : "#"}
                          className="font-medium text-ink transition-colors hover:text-clay"
                        >
                          {product?.name ?? line.productId}
                        </Link>
                        <span className="tnum font-medium">{money(line.lineTotal)}</span>
                      </div>
                      <p className="tnum mt-1 text-sm text-ink-soft">
                        {line.quantity} unit{line.quantity > 1 ? "s" : ""} ,{" "}
                        {line.breakdown
                          .map(
                            (c) =>
                              `${c.qty} ${UNIT_LABEL[c.unit]}${c.qty > 1 ? "s" : ""} at ${money(c.unitPrice)}`,
                          )
                          .join(" plus ")}
                      </p>
                      {line.discount > 0 ? (
                        <p className="mt-0.5 text-sm text-pine">
                          {money(line.discount)} pricelist discount
                        </p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>

            <dl className="tnum space-y-2 border-t border-line px-5 py-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-soft">Rental charge</dt>
                <dd>{money(order.subtotal)}</dd>
              </div>
              {order.discountTotal > 0 ? (
                <div className="flex justify-between text-pine">
                  <dt>Discount</dt>
                  <dd>&minus;{money(order.discountTotal)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between">
                <dt className="text-ink-soft">GST</dt>
                <dd>{money(order.taxTotal)}</dd>
              </div>
              {order.lateFeeTotal > 0 ? (
                <div className="flex justify-between text-rust">
                  <dt>Late fees</dt>
                  <dd>{money(order.lateFeeTotal)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between border-t border-line pt-2 font-display text-lg font-semibold">
                <dt>Total</dt>
                <dd>{money(order.total)}</dd>
              </div>
              <div className="flex justify-between text-ink-faint">
                <dt>Refundable deposit held</dt>
                <dd>{money(order.depositTotal)}</dd>
              </div>
            </dl>

            {order.notes ? (
              <p className="border-t border-line bg-sunken px-5 py-3 text-sm text-ink-soft">
                {order.notes}
              </p>
            ) : null}
          </Card>

          {/* Delivery ------------------------------------------------------ */}
          <Card className="overflow-hidden">
            <div className="border-b border-line px-5 py-3.5">
              <h2 className="font-display font-semibold">Delivery documents</h2>
            </div>

            {deliveries.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-ink-soft">
                Documents are raised when the order is confirmed.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {deliveries.map((delivery) => (
                  <li key={delivery.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                    <Badge tone={delivery.kind === "pickup" ? "clay" : "pine"}>
                      {delivery.kind === "pickup" ? "Pickup" : "Return"}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-sm font-medium">{delivery.documentNo}</p>
                      <p className="text-sm text-ink-soft">
                        {fmtDateTime(delivery.scheduledAt)} , {delivery.handler}
                      </p>
                      <p className="text-xs text-ink-faint">{delivery.address}</p>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={delivery.status} />
                      {delivery.completedAt ? (
                        <p className="mt-1 text-xs text-ink-faint">
                          Done {fmtDateTime(delivery.completedAt)}
                        </p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          {/* Invoices ------------------------------------------------------ */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
              <h2 className="font-display font-semibold">Invoicing</h2>
              {outstanding > 0 ? (
                <span className="tnum text-sm text-ochre">{money(outstanding)} outstanding</span>
              ) : (
                <span className="text-sm text-pine">Settled</span>
              )}
            </div>

            {invoices.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-ink-soft">
                The invoice schedule is created on confirmation. Choose full payment up front or a
                deposit now with the balance before pickup.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {invoices.map((invoice) => (
                  <li key={invoice.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono text-sm font-medium">{invoice.number}</p>
                        <p className="text-sm text-ink-soft">
                          {INVOICE_KIND_LABEL[invoice.kind] ?? invoice.kind}
                          {invoice.dueDate ? ` , due ${fmtDateFull(invoice.dueDate)}` : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="tnum font-medium">{money(invoice.amount)}</p>
                        <StatusBadge status={invoice.status} />
                      </div>
                    </div>

                    {invoice.status !== "paid" && invoice.status !== "void" ? (
                      <div className="mt-3">
                        <ActionForm
                          action={payInvoiceAction}
                          label="Record payment"
                          pendingLabel="Recording…"
                          variant="secondary"
                          size="sm"
                          fields={{ invoiceId: invoice.id }}
                        />
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Reminders ----------------------------------------------------- */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
              <h2 className="font-display font-semibold">Return reminders</h2>
              <Link
                href="/console/notifications"
                className="text-sm text-clay hover:text-clay-hover"
              >
                Rules
              </Link>
            </div>

            {notifications.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-ink-soft">
                Reminders are queued when the order is confirmed.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {notifications.map((notification) => (
                  <li key={notification.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink">{notification.subject}</p>
                        <p className="mt-0.5 text-xs text-ink-faint">
                          {notification.audience === "customer" ? "Customer" : "Ops team"} via{" "}
                          {notification.channel} , {relativeTime(notification.scheduledFor)}
                        </p>
                      </div>
                      <Badge tone={notification.sentAt ? "pine" : "neutral"}>
                        {notification.sentAt ? "Sent" : "Queued"}
                      </Badge>
                    </div>

                    {!notification.sentAt ? (
                      <div className="mt-3">
                        <ActionForm
                          action={sendNotificationAction}
                          label="Send now"
                          pendingLabel="Sending…"
                          variant="ghost"
                          size="sm"
                          fields={{ notificationId: notification.id }}
                        />
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
