import Link from "next/link";
import { ArrowRight, CalendarCheck, Truck, ArrowUUpLeft } from "@phosphor-icons/react/dist/ssr";
import { KitFinder } from "@/components/marketing/kit-finder";
import { RateLadder, type LadderProduct } from "@/components/marketing/rate-ladder";
import { Badge, ButtonLink, Card, SectionHeading } from "@/components/ui";
import { BRAND, categories, products } from "@/lib/data/seed";
import { headline } from "@/lib/domain/reports";
import { money, moneyCompact } from "@/lib/format";

const LADDER_PRODUCTS: LadderProduct[] = ["p-fx6", "p-600d", "p-deck", "p-genset"]
  .map((id) => products.find((p) => p.id === id))
  .filter((p): p is NonNullable<typeof p> => Boolean(p))
  .map((p) => ({ id: p.id, name: p.name, rates: p.rates }));

const STAGES = [
  {
    icon: CalendarCheck,
    title: "Reserve",
    body: "Confirming an order sets those exact units aside for the window. They stop showing as available to everyone else, so two customers can never be sold the same generator for the same Saturday.",
    detail: "Availability is checked per unit, per hour, against every overlapping booking.",
  },
  {
    icon: Truck,
    title: "Hand over",
    body: "A pickup document is raised for the crew: what leaves the shelf, in what quantity, to whom and when. Marking it done moves the stock into the customer's hands in the ledger.",
    detail: "Every line carries its own quantity, so partial handovers stay honest.",
  },
  {
    icon: ArrowUUpLeft,
    title: "Collect",
    body: "When the period ends the system raises a return document against the same lines. Checking it in releases the units back to the shelf and prices any overrun against your late fee rules.",
    detail: "Late fees respect a grace window and a cap, per category.",
  },
];

export default function HomePage() {
  const stats = headline("90d");
  const featured = ["p-fx6", "p-600d", "p-pa", "p-genset", "p-chairs", "p-komodo", "p-tubes", "p-deck"]
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  return (
    <>
      {/* Hero ------------------------------------------------------------- */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <div className="animate-rise">
            <Badge tone="clay">Rental operations platform</Badge>
            <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.08] sm:text-5xl lg:text-6xl">
              Every unit accounted for, from quotation to the moment it comes back.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-ink-soft">
              {BRAND.name} runs the whole rental cycle on one record. Customers book their own dates
              online, the desk sees what is reserved and what is overdue, and the pricing follows
              the clock instead of a flat day rate.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <ButtonLink href="/catalog" size="lg">
                Browse the catalog
                <ArrowRight size={17} weight="bold" aria-hidden="true" />
              </ButtonLink>
              <ButtonLink href="/console" size="lg" variant="secondary">
                Open the operations desk
              </ButtonLink>
            </div>

            <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-4">
              <div>
                <dt className="text-sm text-ink-faint">Booked, last 90 days</dt>
                <dd className="tnum font-display text-xl font-semibold">
                  {moneyCompact(stats.revenue)}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-ink-faint">Units on hire now</dt>
                <dd className="tnum font-display text-xl font-semibold">{stats.unitsOnHire}</dd>
              </div>
              <div>
                <dt className="text-sm text-ink-faint">Returned on time</dt>
                <dd className="tnum font-display text-xl font-semibold">{stats.onTimeRate}%</dd>
              </div>
            </dl>
          </div>

          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://picsum.photos/seed/rental-warehouse-equipment-cases/1100/1300"
              alt="Flight cases and equipment racked in a rental warehouse"
              width={1100}
              height={1300}
              fetchPriority="high"
              className="aspect-[4/5] w-full rounded-2xl border border-line object-cover lg:aspect-[5/6]"
            />
            <p className="mt-3 text-sm text-ink-faint">
              The {BRAND.city} floor, checked in and racked between jobs.
            </p>
          </div>
        </div>
      </section>

      {/* Kit finder ------------------------------------------------------- */}
      <section className="border-b border-line bg-sunken py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-clay">
              Describe the job, not the product codes
            </p>
            <h2 className="font-display text-3xl font-semibold sm:text-4xl">
              Tell us what you are shooting. We will build the kit.
            </h2>
            <p className="mt-3 text-ink-soft">
              Claude reads the brief against live availability and puts together something that
              would actually work on the day, including the power and support most lists forget.
            </p>
          </div>
          <KitFinder />
        </div>
      </section>

      {/* Delivery stages -------------------------------------------------- */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="lg:sticky lg:top-24 lg:self-start">
              <SectionHeading
                eyebrow="Delivery"
                title="Three movements, tracked as documents rather than guesswork."
                body="Rented goods move through the same three stages every time. Each one writes a record, so the shelf count and the paperwork never drift apart."
              />
              <Link
                href="/console/schedule"
                className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-clay transition-colors hover:text-clay-hover"
              >
                See today&rsquo;s pickup and return runs
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

      {/* Pricing ---------------------------------------------------------- */}
      <section className="border-y border-line bg-sunken py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading
            eyebrow="Pricing"
            title="Rates that follow the clock."
            body="Set an hourly, daily, weekly and monthly rate once. The quotation works out the cheapest legitimate combination for the length the customer actually wants, and shows them the arithmetic."
            className="mb-10"
          />
          <RateLadder products={LADDER_PRODUCTS} />
          <p className="mt-4 max-w-2xl text-sm text-ink-faint">
            Corporate agreements, repeat-client cards and seasonal lists layer on top of this, each
            with its own validity window. The most specific active list wins.
          </p>
        </div>
      </section>

      {/* Catalog strip ----------------------------------------------------- */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading
            eyebrow="Catalog"
            title="Six categories, priced per hour or per month."
            action={
              <ButtonLink href="/catalog" variant="secondary">
                All {products.length} items
              </ButtonLink>
            }
            className="mb-8"
          />
        </div>

        <div className="scrollbar-slim flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:px-6">
          {featured.map((product) => (
            <Link
              key={product.id}
              href={`/catalog/${product.slug}`}
              className="group w-64 shrink-0 snap-start"
            >
              <Card className="h-full overflow-hidden transition-colors group-hover:border-clay">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  width={512}
                  height={384}
                  loading="lazy"
                  className="aspect-[4/3] w-full object-cover"
                />
                <div className="p-4">
                  <p className="text-xs uppercase tracking-wider text-ink-faint">
                    {categories.find((c) => c.id === product.categoryId)?.name}
                  </p>
                  <h3 className="mt-1 line-clamp-2 font-medium text-ink">{product.name}</h3>
                  <p className="tnum mt-2 text-sm text-ink-soft">
                    {money(product.rates.day ?? 0)} per day
                    {product.rates.week ? ` · ${money(product.rates.week)} per week` : ""}
                  </p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Closing ----------------------------------------------------------- */}
      <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6">
        <Card className="grain relative overflow-hidden bg-clay p-10 text-on-clay sm:p-14">
          <div className="relative max-w-2xl">
            <h2 className="font-display text-3xl font-semibold sm:text-4xl">
              The desk view is open. Go and look at it.
            </h2>
            <p className="mt-4 text-on-clay/85">
              Overdue returns, today&rsquo;s collection runs, what each pricelist is doing to your
              margin, and a brief that tells you what to chase before lunch. No login wall on this
              build.
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
        </Card>
      </section>
    </>
  );
}
