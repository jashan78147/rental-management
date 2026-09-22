import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/console/action-form";
import { Badge, Card, EmptyState, Stat, StatusBadge, INVOICE_KIND_LABEL } from "@/components/ui";
import { payInvoiceAction } from "@/lib/actions";
import { profileById, settings } from "@/lib/data/store";
import { loadDataset } from "@/lib/data/persist";
import { fmtDateFull, money, moneyCompact } from "@/lib/format";
import { firstParam } from "@/lib/window";

export const metadata: Metadata = { title: "Invoicing" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const FILTERS = [
  { key: "all", label: "All" },
  { key: "sent", label: "Outstanding" },
  { key: "paid", label: "Paid" },
  { key: "late_fee", label: "Late fees" },
];

export default async function InvoicesPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const filter = firstParam(params.filter) ?? "all";

  const store = await loadDataset();

  const invoices = store.invoices
    .filter((invoice) => {
      if (filter === "sent") return invoice.status === "sent" || invoice.status === "draft";
      if (filter === "paid") return invoice.status === "paid";
      if (filter === "late_fee") return invoice.kind === "late_fee";
      return true;
    })
    .sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime());

  const collected = store.invoices
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + i.amount, 0);
  const outstanding = store.invoices
    .filter((i) => i.status === "sent" || i.status === "draft")
    .reduce((sum, i) => sum + i.amount, 0);
  // The refundable security hold lives on the order, not on an invoice line.
  const deposits = store.orders
    .filter((o) => o.status === "confirmed" || o.status === "picked_up")
    .reduce((sum, o) => sum + o.depositTotal, 0);
  const lateFees = store.invoices
    .filter((i) => i.kind === "late_fee")
    .reduce((sum, i) => sum + i.amount, 0);

  const overdue = store.invoices.filter(
    (i) => (i.status === "sent" || i.status === "draft") && i.dueDate && new Date(i.dueDate) < new Date(),
  );

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-3xl font-semibold">Invoicing</h1>
        <p className="mt-1 max-w-3xl text-ink-soft">
          Confirming an order raises its invoice schedule. Take the whole amount up front, or a
          first instalment now with the balance falling due before pickup. The refundable security
          deposit is held separately and never billed. Late returns invoice on their own against
          the fee rules.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Collected" value={moneyCompact(collected)} tone="pine" />
        <Stat
          label="Outstanding"
          value={moneyCompact(outstanding)}
          hint={overdue.length > 0 ? `${overdue.length} past due date` : "All within terms"}
          tone={overdue.length > 0 ? "rust" : "ochre"}
        />
        <Stat label="Deposits held" value={moneyCompact(deposits)} hint="Refundable on return" />
        <Stat
          label="Late fees billed"
          value={moneyCompact(lateFees)}
          tone={lateFees > 0 ? "rust" : "neutral"}
        />
      </div>

      <nav aria-label="Filter invoices" className="my-6 flex flex-wrap gap-2">
        {FILTERS.map((option) => (
          <Link
            key={option.key}
            href={option.key === "all" ? "/console/invoices" : `/console/invoices?filter=${option.key}`}
            aria-current={option.key === filter ? "true" : undefined}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
              option.key === filter
                ? "border-clay bg-clay-tint text-clay"
                : "border-line text-ink-soft hover:border-clay hover:text-clay"
            }`}
          >
            {option.label}
          </Link>
        ))}
      </nav>

      {invoices.length === 0 ? (
        <EmptyState title="No invoices here" body="Nothing matches this filter." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto scrollbar-slim">
            <table className="w-full min-w-[50rem] text-sm">
              <caption className="sr-only">Invoices</caption>
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-ink-faint">
                  <th scope="col" className="px-4 py-3 font-medium">Invoice</th>
                  <th scope="col" className="px-4 py-3 font-medium">Order</th>
                  <th scope="col" className="px-4 py-3 font-medium">Customer</th>
                  <th scope="col" className="px-4 py-3 font-medium">Kind</th>
                  <th scope="col" className="px-4 py-3 font-medium">Due</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Amount</th>
                  <th scope="col" className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {invoices.map((invoice) => {
                  const order = store.orders.find((o) => o.id === invoice.orderId);
                  const customer = order ? profileById(order.customerId) : undefined;
                  const isOverdue =
                    (invoice.status === "sent" || invoice.status === "draft") &&
                    invoice.dueDate != null &&
                    new Date(invoice.dueDate) < new Date();

                  return (
                    <tr key={invoice.id} className="transition-colors hover:bg-sunken">
                      <td className="px-4 py-3 font-mono font-medium">{invoice.number}</td>
                      <td className="px-4 py-3">
                        {order ? (
                          <Link
                            href={`/console/orders/${order.id}`}
                            className="font-mono text-ink transition-colors hover:text-clay"
                          >
                            {order.reference}
                          </Link>
                        ) : (
                          <span className="text-ink-faint">Unknown</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-ink-soft">{customer?.fullName}</td>
                      <td className="px-4 py-3 text-ink-soft">
                        {INVOICE_KIND_LABEL[invoice.kind] ?? invoice.kind}
                      </td>
                      <td className="px-4 py-3">
                        {invoice.dueDate ? (
                          <span className={isOverdue ? "text-rust" : "text-ink-soft"}>
                            {fmtDateFull(invoice.dueDate)}
                          </span>
                        ) : (
                          <span className="text-ink-faint">On issue</span>
                        )}
                      </td>
                      <td className="tnum px-4 py-3 text-right font-medium">
                        {money(invoice.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={invoice.status} />
                          {invoice.status !== "paid" && invoice.status !== "void" ? (
                            <ActionForm
                              action={payInvoiceAction}
                              label="Take payment"
                              pendingLabel="Charging…"
                              variant="ghost"
                              size="sm"
                              fields={{ invoiceId: invoice.id }}
                            />
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card className="mt-8 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-display font-semibold">Payment gateway</h2>
          <Badge tone="clay">{settings.gateway}</Badge>
          <Badge>Test mode</Badge>
        </div>
        <p className="mt-2 max-w-3xl text-sm text-ink-soft">
          Customers pay their own invoices from the portal without the desk having to chase a
          transfer. Taking a payment here records it against the invoice with a gateway reference,
          the same shape the live webhook writes. Set{" "}
          <code className="rounded bg-sunken px-1.5 py-0.5 font-mono text-xs" translate="no">
            STRIPE_SECRET_KEY
          </code>{" "}
          to switch this from recorded payments to real charges.
        </p>
      </Card>
    </div>
  );
}
