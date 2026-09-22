import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle, ShieldCheck, Truck } from "@phosphor-icons/react/dist/ssr";
import { ProductThumb } from "@/components/product-thumb";
import { AddToQuote } from "@/components/shop/add-to-quote";
import { AvailabilityStrip } from "@/components/shop/availability-strip";
import { TenurePicker } from "@/components/shop/tenure-picker";
import { WindowPicker } from "@/components/shop/window-picker";
import { Badge, Card, SectionHeading } from "@/components/ui";
import { affinityRecommend } from "@/lib/ai/recommend";
import { products } from "@/lib/data/seed";
import { categoryById, productBySlug } from "@/lib/data/store";
import { loadDataset } from "@/lib/data/persist";
import { availableUnits, dailyLoad, nextFreeWindow } from "@/lib/domain/availability";
import { cheapestChunks, durationHours, UNIT_LABEL } from "@/lib/domain/pricing";
import type { DurationUnit, PricelistRule } from "@/lib/domain/types";
import { durationLabel, fmtDateTime, money } from "@/lib/format";
import { resolveWindow } from "@/lib/window";

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const product = productBySlug(slug);
  if (!product) return { title: "Not found" };
  return { title: product.name, description: product.description.slice(0, 155) };
}

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { slug } = await params;
  const product = productBySlug(slug);
  if (!product) notFound();

  const search = await searchParams;
  const { startsAt, endsAt } = resolveWindow(search);
  const store = await loadDataset();
  const { reservations } = store;

  const rates = products.find((p) => p.id === product.id)?.rates ?? {};
  const available = availableUnits(product, reservations, startsAt, endsAt);
  const hours = durationHours(startsAt, endsAt);
  const category = categoryById(product.categoryId);

  const ruleMap: Partial<Record<DurationUnit, PricelistRule>> = {};
  for (const [unit, price] of Object.entries(rates) as [DurationUnit, number][]) {
    ruleMap[unit] = {
      id: `view-${unit}`,
      pricelistId: "pl-standard",
      unit,
      minQty: 1,
      price,
      discountPercent: 0,
      discountFixed: 0,
    };
  }

  const chunks = cheapestChunks(hours, ruleMap);
  const windowTotal = chunks.reduce((sum, c) => sum + c.subtotal, 0);
  const flatDayTotal = Math.ceil(hours / 24) * (rates.day ?? 0);
  const saving = Math.max(0, flatDayTotal - windowTotal);
  const perDay = windowTotal / Math.max(1, hours / 24);

  const alternative =
    available <= 0 ? nextFreeWindow(product, reservations, 1, startsAt, hours) : null;

  const related = affinityRecommend(store, [product.id], startsAt, endsAt, 3);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <nav aria-label="Breadcrumb" className="mb-5 text-sm">
        <ol className="flex flex-wrap items-center gap-1.5 text-ink-faint">
          <li>
            <Link href="/" className="transition-colors hover:text-clay">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/catalog" className="transition-colors hover:text-clay">
              Catalog
            </Link>
          </li>
          {category ? (
            <>
              <li aria-hidden="true">/</li>
              <li>
                <Link
                  href={`/catalog?category=${category.id}`}
                  className="transition-colors hover:text-clay"
                >
                  {category.name}
                </Link>
              </li>
            </>
          ) : null}
          <li aria-hidden="true">/</li>
          <li className="text-ink">{product.name}</li>
        </ol>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-12">
        {/* Left: the thing itself ------------------------------------------ */}
        <div>
          <ProductThumb productId={product.id} size="hero" className="border border-line" />

          <Card className="mt-5 p-5">
            <h2 className="font-display text-lg font-semibold">About this item</h2>
            <p className="mt-2 text-ink-soft">{product.description}</p>

            <h3 className="mt-6 font-display font-semibold">Specification</h3>
            <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {Object.entries(product.specs).map(([key, value]) => (
                <div key={key} className="min-w-0">
                  <dt className="text-xs uppercase tracking-wider text-ink-faint">{key}</dt>
                  <dd className="mt-0.5 break-words text-sm text-ink">{value}</dd>
                </div>
              ))}
              <div>
                <dt className="text-xs uppercase tracking-wider text-ink-faint">Units in fleet</dt>
                <dd className="tnum mt-0.5 text-sm text-ink">{product.totalUnits}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-ink-faint">
                  Replacement value
                </dt>
                <dd className="tnum mt-0.5 text-sm text-ink">{money(product.replacementValue)}</dd>
              </div>
            </dl>

            <div className="mt-6 flex flex-wrap gap-2">
              {product.tags.map((tag) => (
                <Badge key={tag}>{tag.replace(/-/g, " ")}</Badge>
              ))}
            </div>
          </Card>
        </div>

        {/* Right: the booking rail ------------------------------------------ */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="flex flex-wrap items-center gap-2">
            {category ? (
              <Link
                href={`/catalog?category=${category.id}`}
                className="text-xs uppercase tracking-wider text-clay"
              >
                {category.name}
              </Link>
            ) : null}
          </div>
          <h1 className="mt-1.5 font-display text-2xl font-semibold sm:text-3xl">{product.name}</h1>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {available > 0 ? (
              <Badge tone={available <= 2 ? "ochre" : "pine"}>
                <CheckCircle size={13} weight="fill" aria-hidden="true" />
                {available} of {product.totalUnits} free for these dates
              </Badge>
            ) : (
              <Badge tone="rust">Fully booked for these dates</Badge>
            )}
            <Badge>
              <Truck size={13} weight="fill" aria-hidden="true" />
              Collect from Pune
            </Badge>
          </div>

          <Card className="mt-5 p-5">
            <TenurePicker
              basePath={`/catalog/${product.slug}`}
              startsAt={startsAt}
              endsAt={endsAt}
            />

            <div className="mt-5 border-t border-line pt-5">
              <p className="text-xs font-medium uppercase tracking-wider text-ink-faint">
                {durationLabel(startsAt, endsAt)} of hire
              </p>

              <div className="mt-1 flex flex-wrap items-baseline gap-3">
                <span className="tnum font-display text-4xl font-semibold text-ink">
                  {money(windowTotal)}
                </span>
                {saving > 0 ? (
                  <span className="tnum text-lg text-ink-faint line-through">
                    {money(flatDayTotal)}
                  </span>
                ) : null}
              </div>

              <p className="tnum mt-1 text-sm text-ink-soft">
                Works out at {money(perDay)} a day.
              </p>

              {saving > 0 ? (
                <p className="mt-3 rounded-lg bg-pine-tint px-3 py-2 text-sm text-pine">
                  You save {money(saving)}. This length bills as{" "}
                  {chunks
                    .map((c) => `${c.qty} ${UNIT_LABEL[c.unit]}${c.qty > 1 ? "s" : ""}`)
                    .join(" plus ")}
                  , which beats charging {Math.ceil(hours / 24)} days.
                </p>
              ) : (
                <p className="mt-3 text-sm text-ink-faint">
                  Billed as{" "}
                  {chunks
                    .map(
                      (c) =>
                        `${c.qty} ${UNIT_LABEL[c.unit]}${c.qty > 1 ? "s" : ""} at ${money(c.unitPrice)}`,
                    )
                    .join(" plus ")}
                  .
                </p>
              )}

              <dl className="tnum mt-4 flex items-center justify-between border-t border-line pt-4 text-sm">
                <dt className="text-ink-soft">Refundable deposit</dt>
                <dd className="font-medium text-ink">{money(product.depositAmount)}</dd>
              </dl>
            </div>

            {alternative ? (
              <p className="mt-4 rounded-lg bg-ochre-tint px-3 py-2 text-sm text-ochre">
                Next free slot for the same length starts {fmtDateTime(alternative.startsAt)}.{" "}
                <Link
                  href={`/catalog/${product.slug}?from=${alternative.startsAt}&to=${alternative.endsAt}`}
                  className="font-medium underline underline-offset-2"
                >
                  Price that window
                </Link>
              </p>
            ) : null}

            <div className="mt-5">
              <AddToQuote productId={product.id} available={available} size="lg" />
            </div>

            <p className="mt-4 flex items-start gap-2 text-xs text-ink-faint">
              <ShieldCheck size={14} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" />
              Nothing is reserved until the quotation is confirmed. The deposit is refunded once the
              item is checked back in.
            </p>
          </Card>

          <Card className="mt-4 p-5">
            <h2 className="font-display font-semibold">Exact dates</h2>
            <p className="mt-1 text-sm text-ink-soft">
              Set a precise pickup and return to price the real window.
            </p>
            <div className="mt-3">
              <WindowPicker startsAt={startsAt} endsAt={endsAt} compact />
            </div>
          </Card>

          <Card className="mt-4 overflow-hidden">
            <div className="border-b border-line px-5 py-3">
              <h2 className="font-display font-semibold">Standard rate card</h2>
            </div>
            <dl className="divide-y divide-line">
              {(Object.entries(rates) as [DurationUnit, number][]).map(([unit, price]) => (
                <div key={unit} className="flex items-center justify-between px-5 py-2.5 text-sm">
                  <dt className="text-ink-soft">Per {UNIT_LABEL[unit]}</dt>
                  <dd className="tnum font-medium text-ink">{money(price)}</dd>
                </div>
              ))}
            </dl>
            <p className="border-t border-line px-5 py-3 text-xs text-ink-faint">
              Corporate and repeat-client agreements price lower and apply automatically at
              checkout.
            </p>
          </Card>
        </div>
      </div>

      <section className="mt-14">
        <SectionHeading
          title="Availability over the next three weeks"
          body="Free units per day, counted against every reservation that overlaps."
          className="mb-5"
        />
        <AvailabilityStrip
          name={product.name}
          slug={product.slug}
          totalUnits={product.totalUnits}
          load={dailyLoad(product, reservations, new Date(startsAt), 21)}
        />
      </section>

      {related.length > 0 ? (
        <section className="mt-14">
          <SectionHeading
            title="Usually booked with this"
            body="Drawn from what previous orders actually put on the truck alongside it."
            className="mb-5"
          />
          <ul className="grid gap-4 sm:grid-cols-3">
            {related.map((item) => (
              <li key={item.productId}>
                <Card className="flex h-full flex-col overflow-hidden">
                  <Link href={`/catalog/${item.slug}`}>
                    <ProductThumb productId={item.productId} size="tile" />
                  </Link>
                  <div className="flex flex-1 flex-col p-4">
                    <Link
                      href={`/catalog/${item.slug}`}
                      className="font-medium text-ink transition-colors hover:text-clay"
                    >
                      {item.name}
                    </Link>
                    <p className="mt-1.5 flex-1 text-sm text-ink-soft">{item.reason}</p>
                    <div className="mt-4">
                      <AddToQuote
                        productId={item.productId}
                        available={item.available}
                        size="sm"
                        label="Add"
                      />
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
