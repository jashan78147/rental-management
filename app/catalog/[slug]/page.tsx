import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { AddToQuote } from "@/components/shop/add-to-quote";
import { AvailabilityStrip } from "@/components/shop/availability-strip";
import { WindowPicker } from "@/components/shop/window-picker";
import { Badge, Card, SectionHeading } from "@/components/ui";
import { affinityRecommend } from "@/lib/ai/recommend";
import { products } from "@/lib/data/seed";
import { categoryById, productBySlug } from "@/lib/data/store";
import { loadDataset } from "@/lib/data/persist";
import { availableUnits, dailyLoad, nextFreeWindow } from "@/lib/domain/availability";
import { cheapestChunks, UNIT_LABEL } from "@/lib/domain/pricing";
import type { DurationUnit, PricelistRule } from "@/lib/domain/types";
import { durationHours } from "@/lib/domain/pricing";
import { fmtDateTime, money } from "@/lib/format";
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

  const alternative =
    available <= 0 ? nextFreeWindow(product, reservations, 1, startsAt, hours) : null;

  const related = affinityRecommend(store, [product.id], startsAt, endsAt, 3);
  const category = categoryById(product.categoryId);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <Link
        href="/catalog"
        className="inline-flex items-center gap-1.5 text-sm text-ink-soft transition-colors hover:text-clay"
      >
        <ArrowLeft size={15} weight="bold" aria-hidden="true" />
        Back to catalog
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1.1fr_1fr]">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.imageUrl}
            alt={product.name}
            width={900}
            height={675}
            fetchPriority="high"
            className="aspect-[4/3] w-full rounded-2xl border border-line object-cover"
          />

          <Card className="mt-5 p-5">
            <h2 className="font-display text-lg font-semibold">Specification</h2>
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
                  Refundable deposit
                </dt>
                <dd className="tnum mt-0.5 text-sm text-ink">{money(product.depositAmount)}</dd>
              </div>
            </dl>
          </Card>
        </div>

        <div>
          {category ? (
            <Link
              href={`/catalog?category=${category.id}`}
              className="text-xs uppercase tracking-wider text-clay"
            >
              {category.name}
            </Link>
          ) : null}
          <h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">{product.name}</h1>
          <p className="mt-4 text-ink-soft">{product.description}</p>

          <div className="mt-5 flex flex-wrap gap-2">
            {product.tags.map((tag) => (
              <Badge key={tag}>{tag.replace(/-/g, " ")}</Badge>
            ))}
          </div>

          <div className="mt-7">
            <WindowPicker startsAt={startsAt} endsAt={endsAt} />
          </div>

          <Card className="mt-5 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-ink-faint">
                  For your dates
                </p>
                <p className="tnum mt-1 font-display text-3xl font-semibold">
                  {money(windowTotal)}
                </p>
                <p className="mt-1 text-sm text-ink-soft">
                  {chunks
                    .map(
                      (c) =>
                        `${c.qty} ${UNIT_LABEL[c.unit]}${c.qty > 1 ? "s" : ""} at ${money(c.unitPrice)}`,
                    )
                    .join(" plus ")}
                </p>
              </div>
              {available > 0 ? (
                <Badge tone={available <= 2 ? "ochre" : "pine"}>
                  {available} of {product.totalUnits} free
                </Badge>
              ) : (
                <Badge tone="rust">Fully booked</Badge>
              )}
            </div>

            {flatDayTotal > windowTotal ? (
              <p className="mt-3 rounded-lg bg-pine-tint px-3 py-2 text-sm text-pine">
                {money(flatDayTotal - windowTotal)} less than billing this at the flat day rate.
              </p>
            ) : null}

            {alternative ? (
              <p className="mt-3 rounded-lg bg-ochre-tint px-3 py-2 text-sm text-ochre">
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

            <dl className="tnum mt-6 grid grid-cols-2 gap-3 border-t border-line pt-5 sm:grid-cols-4">
              {(Object.entries(rates) as [DurationUnit, number][]).map(([unit, price]) => (
                <div key={unit}>
                  <dt className="text-xs uppercase tracking-wider text-ink-faint">
                    Per {UNIT_LABEL[unit]}
                  </dt>
                  <dd className="mt-0.5 font-medium text-ink">{money(price)}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-xs text-ink-faint">
              Standard rate card. Corporate and repeat-client agreements price lower and apply
              automatically at checkout.
            </p>
          </Card>
        </div>
      </div>

      <section className="mt-14">
        <SectionHeading
          eyebrow="Availability"
          title="The next three weeks"
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
            eyebrow="Usually booked with this"
            title="What the same jobs tend to need"
            body="Drawn from what previous orders actually put on the truck alongside it."
            className="mb-5"
          />
          <ul className="grid gap-4 sm:grid-cols-3">
            {related.map((item) => (
              <li key={item.productId}>
                <Card className="flex h-full flex-col overflow-hidden">
                  <Link href={`/catalog/${item.slug}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      width={480}
                      height={360}
                      loading="lazy"
                      className="aspect-[4/3] w-full object-cover"
                    />
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
