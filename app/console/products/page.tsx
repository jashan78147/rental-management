import type { Metadata } from "next";
import Link from "next/link";
import { AvailabilityStrip } from "@/components/shop/availability-strip";
import { Badge, Card } from "@/components/ui";
import { categories, products as productSeeds } from "@/lib/data/seed";
import { allProducts, categoryById, dataset } from "@/lib/data/store";
import { availableUnits, dailyLoad } from "@/lib/domain/availability";
import { topProducts } from "@/lib/domain/reports";
import { money } from "@/lib/format";
import { firstParam } from "@/lib/window";

export const metadata: Metadata = { title: "Fleet" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function FleetPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const focus = firstParam(params.product);

  const store = dataset();
  const now = new Date();
  const weekOut = new Date(now.getTime() + 7 * 86_400_000);

  const performance = new Map(topProducts("90d", 100).map((row) => [row.productId, row]));

  const rows = allProducts.map((product) => ({
    product,
    rates: productSeeds.find((p) => p.id === product.id)?.rates ?? {},
    freeNow: availableUnits(product, store.reservations, now.toISOString(), weekOut.toISOString()),
    stats: performance.get(product.id),
  }));

  const focused = focus ? allProducts.find((p) => p.id === focus || p.slug === focus) : undefined;

  const fleetValue = allProducts.reduce((sum, p) => sum + p.replacementValue * p.totalUnits, 0);
  const totalUnits = allProducts.reduce((sum, p) => sum + p.totalUnits, 0);

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-3xl font-semibold">Fleet</h1>
        <p className="mt-1 text-ink-soft">
          {totalUnits} units across {categories.length} categories, {money(fleetValue)} at
          replacement value. Utilisation is measured over the last 90 days.
        </p>
      </header>

      {focused ? (
        <section className="mb-8">
          <h2 className="mb-3 font-display text-lg font-semibold">
            {focused.name} , next three weeks
          </h2>
          <AvailabilityStrip
            name={focused.name}
            slug={focused.slug}
            totalUnits={focused.totalUnits}
            load={dailyLoad(focused, store.reservations, now, 21)}
          />
        </section>
      ) : null}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto scrollbar-slim">
          <table className="w-full min-w-[54rem] text-sm">
            <caption className="sr-only">Rental fleet with utilisation and availability</caption>
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-ink-faint">
                <th scope="col" className="px-4 py-3 font-medium">Product</th>
                <th scope="col" className="px-4 py-3 font-medium">Category</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Units</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Free this week</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Day rate</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">90d revenue</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Utilisation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map(({ product, rates, freeNow, stats }) => (
                <tr key={product.id} className="transition-colors hover:bg-sunken">
                  <td className="px-4 py-3">
                    <Link
                      href={`/console/products?product=${product.id}`}
                      className="font-medium text-ink transition-colors hover:text-clay"
                    >
                      {product.name}
                    </Link>
                    <span className="block text-xs text-ink-faint">
                      Deposit {money(product.depositAmount)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {categoryById(product.categoryId)?.name}
                  </td>
                  <td className="tnum px-4 py-3 text-right">{product.totalUnits}</td>
                  <td className="px-4 py-3 text-right">
                    <Badge
                      tone={freeNow === 0 ? "rust" : freeNow <= 2 ? "ochre" : "pine"}
                    >
                      {freeNow}
                    </Badge>
                  </td>
                  <td className="tnum px-4 py-3 text-right">{money(rates.day ?? 0)}</td>
                  <td className="tnum px-4 py-3 text-right">
                    {stats ? money(stats.revenue) : <span className="text-ink-faint">None</span>}
                  </td>
                  <td className="tnum px-4 py-3 text-right">
                    {stats ? (
                      <span
                        className={
                          stats.utilisation >= 25
                            ? "text-pine"
                            : stats.utilisation >= 8
                              ? "text-ochre"
                              : "text-ink-faint"
                        }
                      >
                        {stats.utilisation}%
                      </span>
                    ) : (
                      <span className="text-ink-faint">0%</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="mt-4 max-w-3xl text-sm text-ink-faint">
        Utilisation here is unit-days sold against unit-days available for that product alone, so a
        line with 60 truss sections reads low even in a busy quarter. Read it per product rather
        than as a fleet average.
      </p>
    </div>
  );
}
