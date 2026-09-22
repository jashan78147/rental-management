import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/console/action-form";
import { CustomerSwitch } from "@/components/portal/customer-switch";
import { Card, EmptyState, Stat, StatusBadge, INVOICE_KIND_LABEL } from "@/components/ui";
import { payInvoiceAction } from "@/lib/actions";
import { profiles } from "@/lib/data/seed";
import { dataset, profileById } from "@/lib/data/store";
import { fmtDateFull, money } from "@/lib/format";
import { firstParam } from "@/lib/window";

export const metadata: Metadata = { title: "Invoices" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const CUSTOMERS = profiles.filter((p) => p.role === "customer");

export default async function PortalInvoicesPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const customerId = firstParam(params.as) ?? CUSTOMERS[0].id;
  const customer = profileById(customerId) ?? CUSTOMERS[0];

  const store = dataset();
  const orderIds = new Set(
    store.orders.filter((o) => o.customerId === customer.id).map((o) => o.id),
  );

  const invoices = store.invoices
    .filter((i) => orderIds.has(i.orderId) && i.status !== "void")
    .sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime());

  const due = invoices.filter((i) => i.status !== "paid");
  const dueTotal = due.reduce((sum, i) => sum + i.amount, 0);
  const paidTotal = invoices
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + i.amount, 0);
  const deposits = invoices
    .filter((i) => i.kind === "deposit" && i.status === "paid")
    .reduce((sum, i) => sum + i.amount, 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Invoices and payments</h1>
          <p className="mt-1 text-ink-soft">{customer.fullName}</p>
        </div>
        <CustomerSwitch customers={CUSTOMERS} currentId={customer.id} />
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="Due now"
          value={money(dueTotal)}
          hint={`${due.length} open invoice${due.length === 1 ? "" : "s"}`}
          tone={dueTotal > 0 ? "rust" : "pine"}
        />
        <Stat label="Paid to date" value={money(paidTotal)} tone="pine" />
        <Stat label="Deposits held" value={money(deposits)} hint="Refunded after return" />
      </div>

      {invoices.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No invoices yet"
            body="Invoices appear once you confirm a quotation."
          />
        </div>
      ) : (
        <Card className="mt-8 overflow-hidden">
          <ul className="divide-y divide-line">
            {invoices.map((invoice) => {
              const order = store.orders.find((o) => o.id === invoice.orderId);
              return (
                <li key={invoice.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm font-medium">{invoice.number}</p>
                    <p className="text-sm text-ink-soft">
                      {INVOICE_KIND_LABEL[invoice.kind] ?? invoice.kind}
                      {order ? (
                        <>
                          {" for "}
                          <Link
                            href={`/portal/orders/${order.id}?as=${customer.id}`}
                            className="font-mono transition-colors hover:text-clay"
                          >
                            {order.reference}
                          </Link>
                        </>
                      ) : null}
                    </p>
                    {invoice.dueDate ? (
                      <p className="text-xs text-ink-faint">Due {fmtDateFull(invoice.dueDate)}</p>
                    ) : null}
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="tnum font-display text-lg font-semibold">
                      {money(invoice.amount)}
                    </p>
                    <StatusBadge status={invoice.status} />
                  </div>

                  {invoice.status !== "paid" ? (
                    <ActionForm
                      action={payInvoiceAction}
                      label="Pay now"
                      pendingLabel="Taking payment…"
                      size="sm"
                      fields={{ invoiceId: invoice.id }}
                    />
                  ) : null}
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
