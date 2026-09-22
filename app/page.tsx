import Link from "next/link";
import { ArrowRight, ArrowUUpLeft, CalendarCheck, Truck } from "@phosphor-icons/react/dist/ssr";
import { KitFinder } from "@/components/marketing/kit-finder";
import { RateLadder, type LadderProduct } from "@/components/marketing/rate-ladder";
import { ProductThumb, categoryGlyph, categoryTone } from "@/components/product-thumb";
import { ButtonLink, Card, SectionHeading } from "@/components/ui";
import { BRAND, categories, products } from "@/lib/data/seed";
import { loadDataset } from "@/lib/data/persist";
import { availableUnits } from "@/lib/domain/availability";
import { headline } from "@/lib/domain/reports";
import { money, moneyCompact } from "@/lib/format";

const LADDER_PRODUCTS: LadderProduct[] = ["p-fx6", "p-600d", "p-deck", "p-genset"]
  .map((id) => products.find((p) => p.id === id))
  .filter((p): p is NonNullable<typeof p> => Boolean(p))
  .map((p) => ({ id: p.id, name: p.name, rates: p.rates }));

const FEATURED = ["p-fx6", "p-600d", "p-pa", "p-genset", "p-chairs", "p-komodo", "p-tubes", "p-deck"];

const STAGES = [
  {
    icon: CalendarCheck,
    title: "Reserve",
    body: "Confirming an order sets those exact units aside for your window. They stop showing as available to everyone else, so two customers can never be sold the same generator for the same Saturday.",
    detail: "Availability is checked per unit, per hour, against every overlapping booking.",
  },
  {
    icon: Truck,
    title: "Hand over",
    body: "A pickup document is raised for the crew: what leaves the shelf, in what quantity, to whom and when. Marking it done moves the stock into your hands in the ledger.",
    detail: "Every line carries its own quantity, so partial handovers stay honest.",
  },
  {
    icon: ArrowUUpLeft,
    title: "Collect",
    body: "When the period ends a return document is raised against the same lines. Checking it in releases the units back to the shelf and prices any overrun against the late fee rules.",
    detail: "Late fees respect a grace window and a cap, per category.",
  },
];

export default async function HomePage() {
  const store = await loadDataset();
  const stats = headline(store, "90d");

  const now = new Date();
  const weekOut = new Date(now.getTime() + 7 * 86_400_000);

  // Cheapest day rate in each category, so the board can say what things cost.
  const categoryCards = categories.map((category) => {
    const inCategory = products.filter((p) => p.categoryId === category.id);
    const fromDay = Math.min(...inCategory.map((p) => p.rates.day ?? Infinity));
    return {
      ...category,
      count: inCategory.length,
      fromDay: Number.isFinite(fromDay) ? fromDay : 0,
    };
  });

  const featured = FEATURED.map((id) => products.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .map((product) => ({
      product,
      free: availableUnits(
        { ...product },
        store.reservations,
        now.toISOString(),
        weekOut.toISOString(),
      ),
    }));

  return (
    <>
      {/* Hero -------------------------------------------------------------- */}
      <section className="border-b border-line">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-14 pt-12 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16 lg:pb-20 lg:pt-20">
          <div className="animate-rise">
            <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Camera, lighting, audio and staging, hired by the hour.
            </h1>
            <p className="mt-5 max-w-lg text-lg text-ink-soft">
              See what is free on your dates, book it online, and collect it from {BRAND.city}.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <ButtonLink href="/catalog" size="lg">
                Browse the catalog
                <ArrowRight size={17} weight="bold" aria-hidden="true" />
              </ButtonLink>
              <ButtonLink href="#kit-builder" size="lg" variant="secondary">
                Build me a kit
              </ButtonLink>
            </div>
          </div>

          {/* The board answers "what do you actually rent" before anyone reads
              a word of copy, and does it with real counts and real rates. */}
          <div className="animate-fade">
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2">
              {categoryCards.map((category) => (
                  <li key={category.id}>
                    <Link href={`/catalog?category=${category.id}`} className="group block h-full">
                      <Card className="flex h-full flex-col justify-between gap-6 p-4 transition-colors group-hover:border-clay">
                        <span
                          aria-hidden="true"
                          className={`grid h-10 w-10 place-items-center rounded-lg ${categoryTone(category.id)}`}
                        >
                          {categoryGlyph(category.id, 22)}
                        </span>
                        <span>
                          <span className="block font-display font-semibold text-ink transition-colors group-hover:text-clay">
                            {category.name}
                          </span>
                          <span className="tnum mt-1 block text-sm text-ink-faint">
                            {category.count} items, from {money(category.fromDay)} a day
                          </span>
                        </span>
                      </Card>
                    </Link>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Free this week ---------------------------------------------------- */}
      <section className="py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading
            title="Free to book this week."
            body={`${products.length} items on the shelf in ${BRAND.city}. ${stats.onTimeRate}% of hires came back on time this quarter.`}
            action={
              <ButtonLink href="/catalog" variant="secondary">
                See live availability
              </ButtonLink>
            }
            className="mb-8"
          />
        </div>

        <ul className="scrollbar-slim flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:px-6">
          {featured.map(({ product, free }) => (
            <li key={product.id} className="w-60 shrink-0 snap-start">
              <Link href={`/catalog/${product.slug}`} className="group block h-full">
                <Card className="flex h-full flex-col overflow-hidden transition-colors group-hover:border-clay">
                  <ProductThumb productId={product.id} size="tile" />
                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="line-clamp-2 font-medium text-ink transition-colors group-hover:text-clay">
                      {product.name}
                    </h3>
                    <p className="tnum mt-2 flex-1 text-sm text-ink-soft">
                      {money(product.rates.day ?? 0)} a day
                    </p>
                    <p className="tnum mt-3 text-sm text-ink-faint">
                      {free > 0 ? `${free} of ${product.totalUnits} free now` : "Fully booked"}
                    </p>
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Kit builder -------------------------------------------------------- */}
      <section id="kit-builder" className="border-y border-line bg-sunken py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto mb-9 max-w-2xl text-center">
            <h2 className="font-display text-3xl font-semibold sm:text-4xl">
              Not sure what the job needs? Describe it.
            </h2>
            <p className="mt-3 text-ink-soft">
              Tell us what you are shooting or running and the kit builder puts together something
              that would actually work on the day. Lights running off-grid get a generator. Cameras
              away from a socket get batteries.
            </p>
          </div>
          <KitFinder />
        </div>
      </section>

      {/* How hiring works --------------------------------------------------- */}
      <section className="py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="lg:sticky lg:top-24 lg:self-start">
              <SectionHeading
                title="What happens after you book."
                body="Rented goods move through the same three stages every time. Each one writes a record, so the shelf count and the paperwork never drift apart."
              />
              <Link
                href="/portal"
                className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-clay transition-colors hover:text-clay-hover"
              >
                Track a hire in the customer portal
                <ArrowRight size={15} weight="bold" aria-hidden="true" />
              </Link>
            </div>

            <ol className="space-y-4">
              {STAGES.map((stage) => (
                <li key={stage.title}>
                  <Card className="flex gap-5 p-6">
                    <span
                      aria-hidden="true"
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-clay-tint text-clay"
                    >
                      <stage.icon size={21} weight="bold" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-display text-xl font-semibold">{stage.title}</h3>
                      <p className="mt-2 text-ink-soft">{stage.body}</p>
                      <p className="mt-3 text-sm text-ink-faint">{stage.detail}</p>
                    </div>
                  </Card>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Pricing ------------------------------------------------------------ */}
      <section className="border-y border-line bg-sunken py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading
            title="Longer hires cost less, without you asking."
            body="Every item carries an hourly, daily, weekly and monthly rate. The quotation works out the cheapest legitimate combination for the length you actually want, and shows you the arithmetic."
            className="mb-9"
          />
          <RateLadder products={LADDER_PRODUCTS} />
          <p className="mt-4 max-w-2xl text-sm text-ink-faint">
            Corporate agreements, repeat-client cards and seasonal rates layer on top of this, each
            with its own validity window.
          </p>
        </div>
      </section>

      {/* Operations ---------------------------------------------------------- */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
        <Card className="grain relative overflow-hidden bg-clay p-10 text-on-clay sm:p-14">
          <div className="relative grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div className="max-w-2xl">
              <h2 className="font-display text-3xl font-semibold sm:text-4xl">
                Running the desk, not just the shop.
              </h2>
              <p className="mt-4 text-on-clay/85">
                The same record drives the operations side: overdue returns, today&rsquo;s collection
                runs, what each pricelist is doing to margin, and a brief that says what to chase
                before lunch. Open, no login.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/console"
                  className="inline-flex h-12 items-center gap-2 rounded-lg bg-paper px-6 font-medium text-ink transition-transform active:translate-y-px"
                >
                  Operations desk
                  <ArrowRight size={17} weight="bold" aria-hidden="true" />
                </Link>
                <Link
                  href="/console/reports"
                  className="inline-flex h-12 items-center rounded-lg border border-on-clay/35 px-6 font-medium text-on-clay transition-colors hover:border-on-clay"
                >
                  Reports and exports
                </Link>
              </div>
            </div>

            <dl className="grid grid-cols-3 gap-6 lg:grid-cols-1 lg:gap-5">
              <div>
                <dt className="text-sm text-on-clay/70">Booked, 90 days</dt>
                <dd className="tnum font-display text-2xl font-semibold">
                  {moneyCompact(stats.revenue)}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-on-clay/70">Units on hire</dt>
                <dd className="tnum font-display text-2xl font-semibold">{stats.unitsOnHire}</dd>
              </div>
              <div>
                <dt className="text-sm text-on-clay/70">Back on time</dt>
                <dd className="tnum font-display text-2xl font-semibold">{stats.onTimeRate}%</dd>
              </div>
            </dl>
          </div>
        </Card>
      </section>
    </>
  );
}
