import type { Metadata } from "next";
import Link from "next/link";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
import { AddToQuote } from "@/components/shop/add-to-quote";
import { AvailabilityStrip } from "@/components/shop/availability-strip";
import { WindowPicker } from "@/components/shop/window-picker";
import { Badge, Card, EmptyState, inputClass } from "@/components/ui";
import { categories, products } from "@/lib/data/seed";
import { allProducts } from "@/lib/data/store";
import { loadDataset } from "@/lib/data/persist";
import { availableUnits, dailyLoad } from "@/lib/domain/availability";
import { cn, durationLabel, money } from "@/lib/format";
import { firstParam, resolveWindow } from "@/lib/window";

export const metadata: Metadata = {
  title: "Catalog",
  description: "Browse rentable equipment with live availability for your dates.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function CatalogPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const { startsAt, endsAt } = resolveWindow(params);
  const activeCategory = firstParam(params.category);
  const query = firstParam(params.q)?.trim().toLowerCase() ?? "";
  const view = firstParam(params.view) === "calendar" ? "calendar" : "list";

  const { reservations } = await loadDataset();

  const visible = allProducts
    .filter((p) => p.isRentable)
    .filter((p) => !activeCategory || p.categoryId === activeCategory)
    .filter((p) => {
      if (!query) return true;
      const haystack = `${p.name} ${p.description} ${p.tags.join(" ")}`.toLowerCase();
      return haystack.includes(query);
    })
    .map((product) => ({
      product,
      rates: products.find((p) => p.id === product.id)?.rates ?? {},
      available: availableUnits(product, reservations, startsAt, endsAt),
    }));

  const freeCount = visible.filter((row) => row.available > 0).length;

  function href(next: Record<string, string | undefined>) {
    const search = new URLSearchParams();
    search.set("from", startsAt);
    search.set("to", endsAt);
    if (activeCategory) search.set("category", activeCategory);
    if (query) search.set("q", query);
    if (view === "calendar") search.set("view", "calendar");
    for (const [key, value] of Object.entries(next)) {
      if (value === undefined) search.delete(key);
      else search.set(key, value);
    }
    return `/catalog?${search.toString()}`;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">Catalog</h1>
        <p className="mt-2 max-w-2xl text-ink-soft">
          Availability is calculated against every overlapping reservation, so what you see here is
          what is genuinely free for {durationLabel(startsAt, endsAt)} from your pickup time.
        </p>
      </header>

      <WindowPicker startsAt={startsAt} endsAt={endsAt} />

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <form action="/catalog" method="get" className="flex min-w-0 flex-1 items-center gap-2 sm:max-w-sm">
          <input type="hidden" name="from" value={startsAt} />
          <input type="hidden" name="to" value={endsAt} />
          {activeCategory ? <input type="hidden" name="category" value={activeCategory} /> : null}
          {view === "calendar" ? <input type="hidden" name="view" value="calendar" /> : null}
          <label htmlFor="catalog-search" className="sr-only">
            Search the catalog
          </label>
          <div className="relative min-w-0 flex-1">
            <MagnifyingGlass
              size={16}
              weight="bold"
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
            />
            <input
              id="catalog-search"
              name="q"
              type="search"
              defaultValue={query}
              placeholder="Generator, truss, wireless…"
              spellCheck={false}
              className={cn(inputClass, "pl-9")}
            />
          </div>
        </form>

        <div
          role="group"
          aria-label="Catalog view"
          className="flex rounded-lg border border-line p-0.5"
        >
          <Link
            href={href({ view: undefined })}
            aria-current={view === "list" ? "true" : undefined}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              view === "list" ? "bg-clay text-on-clay" : "text-ink-soft hover:text-ink",
            )}
          >
            List
          </Link>
          <Link
            href={href({ view: "calendar" })}
            aria-current={view === "calendar" ? "true" : undefined}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              view === "calendar" ? "bg-clay text-on-clay" : "text-ink-soft hover:text-ink",
            )}
          >
            Calendar
          </Link>
        </div>
      </div>

      <nav aria-label="Categories" className="scrollbar-slim mt-5 flex gap-2 overflow-x-auto pb-2">
        <Link
          href={href({ category: undefined })}
          aria-current={!activeCategory ? "true" : undefined}
          className={cn(
            "whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
            !activeCategory
              ? "border-clay bg-clay-tint text-clay"
              : "border-line text-ink-soft hover:border-clay hover:text-clay",
          )}
        >
          Everything
        </Link>
        {categories.map((category) => (
          <Link
            key={category.id}
            href={href({ category: category.id })}
            aria-current={activeCategory === category.id ? "true" : undefined}
            className={cn(
              "whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              activeCategory === category.id
                ? "border-clay bg-clay-tint text-clay"
                : "border-line text-ink-soft hover:border-clay hover:text-clay",
            )}
          >
            {category.name}
          </Link>
        ))}
      </nav>

      <p className="mt-5 text-sm text-ink-soft" aria-live="polite">
        <span className="tnum font-medium text-ink">{freeCount}</span> of {visible.length} items
        available for these dates.
      </p>

      {visible.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Nothing matched that"
            body="Try a broader search, or clear the category filter to see the whole catalog."
          />
        </div>
      ) : view === "calendar" ? (
        <div className="mt-6 space-y-3">
          {visible.map(({ product }) => (
            <AvailabilityStrip
              key={product.id}
              name={product.name}
              slug={product.slug}
              totalUnits={product.totalUnits}
              load={dailyLoad(product, reservations, new Date(startsAt), 21)}
            />
          ))}
        </div>
      ) : (
        <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map(({ product, rates, available }) => (
            <li key={product.id}>
              <Card className="flex h-full flex-col overflow-hidden">
                <Link href={`/catalog/${product.slug}`} className="group block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    width={640}
                    height={480}
                    loading="lazy"
                    className="aspect-[4/3] w-full object-cover transition-opacity group-hover:opacity-90"
                  />
                </Link>

                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs uppercase tracking-wider text-ink-faint">
                      {categories.find((c) => c.id === product.categoryId)?.name}
                    </p>
                    {available > 0 ? (
                      <Badge tone={available <= 2 ? "ochre" : "pine"}>
                        {available} of {product.totalUnits} free
                      </Badge>
                    ) : (
                      <Badge tone="rust">Fully booked</Badge>
                    )}
                  </div>

                  <h2 className="mt-1.5">
                    <Link
                      href={`/catalog/${product.slug}`}
                      className="font-display text-lg font-semibold text-ink transition-colors hover:text-clay"
                    >
                      {product.name}
                    </Link>
                  </h2>

                  <p className="mt-2 line-clamp-2 text-sm text-ink-soft">{product.description}</p>

                  <dl className="tnum mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    {rates.day ? (
                      <div className="flex gap-1.5">
                        <dt className="text-ink-faint">Day</dt>
                        <dd className="font-medium text-ink">{money(rates.day)}</dd>
                      </div>
                    ) : null}
                    {rates.week ? (
                      <div className="flex gap-1.5">
                        <dt className="text-ink-faint">Week</dt>
                        <dd className="font-medium text-ink">{money(rates.week)}</dd>
                      </div>
                    ) : null}
                  </dl>

                  <div className="mt-4 pt-1">
                    <AddToQuote productId={product.id} available={available} size="sm" label="Add" />
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
