import type { Metadata } from "next";
import { ProductThumb } from "@/components/product-thumb";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import { ActionForm } from "@/components/console/action-form";
import { Badge, Card, StatusBadge, INVOICE_KIND_LABEL } from "@/components/ui";
import { confirmOrderAction, payInvoiceAction } from "@/lib/actions";
import { pricelists, productById, profileById, settings } from "@/lib/data/store";
import { loadDataset } from "@/lib/data/persist";
import { UNIT_LABEL } from "@/lib/domain/pricing";
import { durationLabel, fmtDateFull, fmtDateTime, money, relativeTime } from "@/lib/format";
import { firstParam } from "@/lib/window";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const store = await loadDataset();
  const order = store.orders.find((o) => o.id === id);
  return { title: order ? order.reference : "Rental" };
}

export default async function PortalOrderPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const search = await searchParams;

  const store = await loadDataset();
  const order = store.orders.find((o) => o.id === id);
  if (!order) notFound();

  const customer = profileById(order.customerId);
  const viewingAs = firstParam(search.as) ?? order.customerId;
  const pricelist = pricelists.find((p) => p.id === order.pricelistId);

  const invoices = store.invoices
    .filter((i) => i.orderId === order.id && i.status !== "void")
    .sort((a, b) => new Date(a.issuedAt).getTime() - new Date(b.issuedAt).getTime());
  const deliveries = store.deliveries.filter((d) => d.orderId === order.id);

  const due = invoices.filter((i) => i.status !== "paid");
  const dueTotal = due.reduce((sum, i) => sum + i.amount, 0);

  const pickup = deliveries.find((d) => d.kind === "pickup");
  const dropoff = deliveries.find((d) => d.kind === "return");

  const awaitingConfirmation = order.status === "quotation" || order.status === "quotation_sent";

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link
        href={`/portal?as=${viewingAs}`}
        className="inline-flex items-center gap-1.5 text-sm text-ink-soft transition-colors hover:text-clay"
      >
        <ArrowLeft size={15} weight="bold" aria-hidden="true" />
        My rentals
      </Link>

      <header className="mt-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-mono text-2xl font-semibold">{order.reference}</h1>
          <StatusBadge status={order.status} />
        </div>
        <p className="mt-2 text-ink-soft">
          {fmtDateTime(order.startsAt)} to {fmtDateTime(order.endsAt)} ,{" "}
          {durationLabel(order.startsAt, order.endsAt)}
        </p>
        {order.status === "picked_up" ? (
          <p className="mt-1 text-sm text-ochre">Due back {relativeTime(order.endsAt)}.</p>
        ) : null}
      </header>

      {awaitingConfirmation ? (
        <Card className="mt-6 border-clay/30 bg-clay-tint p-5">
          <h2 className="font-display text-lg font-semibold text-clay">
            This quotation is not reserved yet
          </h2>
          <p className="mt-2 text-sm text-ink">
            Nothing is set aside until you confirm. Confirming reserves every unit for your dates,
            raises your invoice schedule and books the pickup and return slots.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <ActionForm
              action={confirmOrderAction}
              label="Confirm and reserve"
              pendingLabel="Reserving…"
              fields={{ orderId: order.id, invoiceMode: "deposit_then_balance" }}
            />
            <ActionForm
              action={confirmOrderAction}
              label="Confirm and pay in full"
              pendingLabel="Reserving…"
              variant="secondary"
              fields={{ orderId: order.id, invoiceMode: "full_upfront" }}
            />
          </div>
        </Card>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
              <h2 className="font-display font-semibold">What you are renting</h2>
              {pricelist ? (
                <span className="text-sm text-ink-faint">{pricelist.name}</span>
              ) : null}
            </div>

            <ul className="divide-y divide-line">
              {order.lines.map((line) => {
                const product = productById(line.productId);
                return (
                  <li key={line.id} className="flex gap-4 px-5 py-4">
                    <ProductThumb productId={line.productId} size="lg" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <Link
                          href={product ? `/catalog/${product.slug}` : "#"}
                          className="font-medium text-ink transition-colors hover:text-clay"
                        >
                          {product?.name}
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
                          {money(line.discount)} off your rate card
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
                  <dt>Your discount</dt>
                  <dd>&minus;{money(order.discountTotal)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between">
                <dt className="text-ink-soft">GST at {settings.taxPercent}%</dt>
                <dd>{money(order.taxTotal)}</dd>
              </div>
              {order.lateFeeTotal > 0 ? (
                <div className="flex justify-between text-rust">
                  <dt>Late return fee</dt>
                  <dd>{money(order.lateFeeTotal)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between border-t border-line pt-2 font-display text-lg font-semibold">
                <dt>Total</dt>
                <dd>{money(order.total)}</dd>
              </div>
              <div className="flex justify-between text-ink-faint">
                <dt>Refundable deposit</dt>
                <dd>{money(order.depositTotal)}</dd>
              </div>
            </dl>
          </Card>

          {pickup || dropoff ? (
            <Card className="overflow-hidden">
              <div className="border-b border-line px-5 py-3.5">
                <h2 className="font-display font-semibold">Pickup and return</h2>
              </div>
              <ul className="divide-y divide-line">
                {[pickup, dropoff].filter(Boolean).map((movement) => (
                  <li key={movement!.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                    <Badge tone={movement!.kind === "pickup" ? "clay" : "pine"}>
                      {movement!.kind === "pickup" ? "Collect from us" : "Return to us"}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink">
                        {fmtDateTime(movement!.scheduledAt)}
                      </p>
                      <p className="text-sm text-ink-soft">{movement!.address}</p>
                    </div>
                    <StatusBadge status={movement!.status} />
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6 lg:sticky lg:top-24">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
              <h2 className="font-display font-semibold">Payments</h2>
              {dueTotal > 0 ? (
                <span className="tnum text-sm text-ochre">{money(dueTotal)} due</span>
              ) : (
                <span className="text-sm text-pine">Settled</span>
              )}
            </div>

            {invoices.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-ink-soft">
                Your invoice schedule appears here once this quotation is confirmed.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {invoices.map((invoice) => (
                  <li key={invoice.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink">
                          {INVOICE_KIND_LABEL[invoice.kind] ?? invoice.kind}
                        </p>
                        <p className="font-mono text-xs text-ink-faint">{invoice.number}</p>
                        {invoice.dueDate ? (
                          <p className="mt-0.5 text-xs text-ink-faint">
                            Due {fmtDateFull(invoice.dueDate)}
                          </p>
                        ) : null}
                      </div>
                      <div className="text-right">
                        <p className="tnum font-medium">{money(invoice.amount)}</p>
                        <StatusBadge status={invoice.status} />
                      </div>
                    </div>

                    {invoice.status !== "paid" ? (
                      <div className="mt-3">
                        <ActionForm
                          action={payInvoiceAction}
                          label={`Pay ${money(invoice.amount)}`}
                          pendingLabel="Taking payment…"
                          size="sm"
                          fields={{ invoiceId: invoice.id }}
                        />
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}

            <p className="flex items-start gap-2 border-t border-line bg-sunken px-5 py-3 text-xs text-ink-faint">
              <ShieldCheck size={14} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" />
              Card details are handled by the gateway, never by this site. This build runs the
              gateway in test mode, so nothing is actually charged.
            </p>
          </Card>

          {order.notes ? (
            <Card className="p-5">
              <h2 className="font-display font-semibold">Notes on this booking</h2>
              <p className="mt-2 text-sm text-ink-soft">{order.notes}</p>
            </Card>
          ) : null}

          <Card className="p-5">
            <h2 className="font-display font-semibold">Billed to</h2>
            <p className="mt-2 text-sm text-ink">{customer?.fullName}</p>
            <p className="text-sm text-ink-soft">{customer?.email}</p>
            <p className="text-sm text-ink-soft">{customer?.phone}</p>
            <p className="mt-1 text-sm text-ink-faint">{customer?.city}</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
