import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUUpLeft,
  BellRinging,
  CalendarCheck,
  ClipboardText,
  Coins,
  SealCheck,
  Truck,
  Wrench,
} from "@phosphor-icons/react/dist/ssr";
import { KitFinder } from "@/components/marketing/kit-finder";
import { Rail } from "@/components/marketing/rail";
import { RateLadder, type LadderProduct } from "@/components/marketing/rate-ladder";
import { CategoryThumb, ProductThumb } from "@/components/product-thumb";
import { AddToQuote } from "@/components/shop/add-to-quote";
import { ButtonLink, Card, SectionHeading } from "@/components/ui";
import { categories, pricelists, products } from "@/lib/data/seed";
import { loadDataset } from "@/lib/data/persist";
import { availableUnits } from "@/lib/domain/availability";
import { headline } from "@/lib/domain/reports";
import { fmtDateFull, money, moneyCompact } from "@/lib/format";

const LADDER_PRODUCTS: LadderProduct[] = ["p-fx6", "p-600d", "p-deck", "p-genset"]
  .map((id) => products.find((p) => p.id === id))
  .filter((p): p is NonNullable<typeof p> => Boolean(p))
  .map((p) => ({ id: p.id, name: p.name, rates: p.rates }));

const FEATURED = [
  "p-fx6", "p-600d", "p-pa", "p-genset", "p-chairs",
  "p-komodo", "p-tubes", "p-deck", "p-mixpre", "p-lounge",
];

const HERO_POINTS = [
  { icon: CalendarCheck, label: "Live availability" },
  { icon: Coins, label: "Cheapest rate applied" },
  { icon: SealCheck, label: "Deposit refunded" },
];

const ASSURANCES = [
  { icon: Wrench, title: "Checked between hires", body: "Tested and logged back in before it goes out again." },
  { icon: Truck, title: "Collect or delivered", body: "Pick up from the floor, or we run it to site." },
  { icon: SealCheck, title: "Deposit refunded", body: "Held separately, released on check-in." },
  { icon: BellRinging, title: "Told before it is due", body: "Reminders go out before your return date." },
];

const STEPS = [
  {
    icon: ClipboardText,
    title: "Pick your dates and kit",
    body: "Availability is live, so what you see is genuinely free for the window you choose.",
  },
  {
    icon: CalendarCheck,
    title: "Confirm the quotation",
    body: "Confirming reserves the units, raises your invoice schedule and books the collection slot.",
  },
  {
    icon: ArrowUUpLeft,
    title: "Collect, use, return",
    body: "We remind you before the return date. Check it back in and the deposit is released.",
  },
];

const STAGE_DETAIL = [
  {
    icon: CalendarCheck,
    title: "Reserve",
    body: "Confirming an order sets those exact units aside for your window. They stop showing as available to everyone else, so two customers can never be sold the same generator for the same Saturday.",
  },
  {
    icon: Truck,
    title: "Hand over",
    body: "A pickup document is raised for the crew: what leaves the shelf, in what quantity, to whom and when. Marking it done moves the stock into your hands in the ledger.",
  },
  {
    icon: ArrowUUpLeft,
    title: "Collect",
    body: "When the period ends a return document is raised against the same lines. Checking it in releases the units and prices any overrun against the late fee rules.",
  },
];

export default async function HomePage() {
  const store = await loadDataset();
  const stats = headline(store, "90d");

  const now = new Date();
  const weekOut = new Date(now.getTime() + 7 * 86_400_000);

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
    .map((product) => {
      const free = availableUnits(
        { ...product },
        store.reservations,
        now.toISOString(),
        weekOut.toISOString(),
      );
      const weekRate = product.rates.week;
      const dayRate = product.rates.day ?? 0;
      const weekAsDays = dayRate * 7;
      return {
        product,
        free,
        dayRate,
        // A week against seven day rates, which is the saving people care about.
        weekSaving: weekRate && weekAsDays > weekRate ? weekAsDays - weekRate : 0,
      };
    });

  // Storefront offers are the live pricelists, described in customer terms.
  const reference = products.find((p) => p.id === "p-fx6");
  const standardDay = reference?.rates.day ?? 0;
  const today = now.toISOString().slice(0, 10);

  const offers = pricelists
    .filter((list) => list.id !== "pl-standard" && list.isActive)
    .map((list) => {
      const dayRule = list.rules.find(
        (r) => r.unit === "day" && r.price > 0 && r.productId === reference?.id,
      );
      const discountRule = list.rules.find((r) => r.discountPercent > 0);
      const percent = dayRule && standardDay
        ? Math.round((1 - dayRule.price / standardDay) * 100)
        : (discountRule?.discountPercent ?? null);
      const upcoming = Boolean(list.validFrom && today < list.validFrom);
      const expired = Boolean(list.validTo && today > list.validTo);
      return { list, percent, upcoming, expired };
    })
    .filter((offer) => offer.percent !== null && offer.percent > 0 && !offer.expired)
    .slice(0, 3);

  return (
    <>
      {/* Hero ---------------------------------------------------------------- */}
      <section className="px-4 pt-4 sm:px-6">
        <div className="photo-band photo-band--drift mx-auto max-w-7xl rounded-[28px] px-6 py-14 sm:px-12 sm:py-20 lg:px-16 lg:py-24">
          {/* A crew rigging a light. It is a backdrop for the headline, never
              content, so it carries no alt text and sits under a scrim that
              holds the body copy well clear of the contrast floor. */}
          <Image
            src="/catalog/hero-rig.jpg"
            alt=""
            fill
            priority
            sizes="(max-width: 1280px) 100vw, 1280px"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gold/20 blur-3xl"
          />
          <div className="animate-rise relative max-w-2xl">
            <h1 className="font-display text-4xl font-semibold leading-[1.06] text-white sm:text-5xl lg:text-6xl">
              Camera, lighting, audio
              <span className="block text-gold">and staging, on hire.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-white/75">
              By the hour, day, week or month. Check what is free on your dates and book it online.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <ButtonLink href="/catalog" size="lg" variant="gold">
                Browse the catalog
                <ArrowRight size={17} weight="bold" aria-hidden="true" />
              </ButtonLink>
              <Link
                href="#kit-builder"
                className="inline-flex h-12 items-center rounded-full border border-white/30 px-6 font-medium text-white transition-[background-color,border-color,transform] duration-150 ease-[var(--ease-out)] hover:border-white hover:bg-white/10 active:scale-[0.97]"
              >
                Build me a kit
              </Link>
            </div>

            <ul className="mt-10 flex flex-wrap gap-x-8 gap-y-4">
              {HERO_POINTS.map((point) => (
                <li key={point.label} className="flex items-center gap-2 text-sm text-white/80">
                  <point.icon size={18} weight="duotone" className="text-gold" aria-hidden="true" />
                  {point.label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Categories ----------------------------------------------------------- */}
      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading align="center" title="Categories" className="mb-8" />

          <ul className="stagger scrollbar-none -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-6">
            {categoryCards.map((category) => (
              <li key={category.id} className="w-40 shrink-0 snap-start sm:w-auto">
                <Link href={`/catalog?category=${category.id}`} className="group block h-full">
                  <Card className="card-hover flex h-full flex-col overflow-hidden p-0 group-hover:border-clay">
                    {/* The photo is decorative: the card is already labelled
                        by its name, so a description here would just be read
                        out twice. Categories without one fall back to the
                        drawing. */}
                    {category.imageUrl ? (
                      <span className="photo-chip block aspect-[16/11] w-full">
                        <Image
                          src={category.imageUrl}
                          alt=""
                          fill
                          sizes="(max-width: 640px) 160px, (max-width: 1024px) 33vw, 17vw"
                        />
                      </span>
                    ) : (
                      <CategoryThumb categoryId={category.id} className="aspect-[16/11] w-full" />
                    )}
                    {/* Names run to one or two lines; pinning the rate to the bottom keeps
                        the row of prices on one line across the strip. */}
                    <span className="flex flex-1 flex-col justify-between gap-1 px-3 py-3 text-center">
                      <span className="block text-sm font-medium leading-tight text-ink">
                        {category.name}
                      </span>
                      <span className="tnum mt-1 block text-xs text-ink-faint">
                        from {money(category.fromDay)}/day
                      </span>
                    </span>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Assurances ----------------------------------------------------------- */}
      <section className="px-4 sm:px-6">
        <ul className="reveal mx-auto grid max-w-7xl gap-6 rounded-[20px] bg-sunken px-6 py-6 sm:grid-cols-2 lg:grid-cols-4 lg:px-10">
          {ASSURANCES.map((item) => (
            <li key={item.title} className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-0.5 shrink-0 text-gold-strong">
                <item.icon size={22} weight="duotone" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">{item.title}</p>
                <p className="mt-0.5 text-sm text-ink-soft">{item.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Featured, on the dark panel ------------------------------------------ */}
      <section className="px-4 py-12 sm:px-6 sm:py-16">
        <div className="panel-dark mx-auto max-w-7xl rounded-[28px] px-5 py-8 sm:px-10 sm:py-12">
          <div className="mb-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm text-white/60">Free to book this week</p>
              <h2 className="font-display text-2xl font-semibold text-white sm:text-3xl">
                Ready on the shelf
              </h2>
            </div>
            <Link
              href="/catalog"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-gold transition-colors hover:text-white"
            >
              View all {products.length} items
              <ArrowRight size={15} weight="bold" aria-hidden="true" />
            </Link>
          </div>

          <Rail label="Featured items">
            {featured.map(({ product, free, dayRate, weekSaving }) => (
              <li key={product.id} className="w-56 shrink-0 snap-start sm:w-60">
                <Card className="card-hover relative flex h-full flex-col overflow-hidden">
                  {free === 0 ? (
                    <span className="absolute left-3 top-3 z-10 rounded-full bg-rust px-2.5 py-1 text-xs font-medium text-white">
                      Fully booked
                    </span>
                  ) : free <= 2 ? (
                    <span className="absolute left-3 top-3 z-10 rounded-full bg-ochre px-2.5 py-1 text-xs font-medium text-white">
                      Only {free} left
                    </span>
                  ) : weekSaving > 0 ? (
                    <span className="absolute left-3 top-3 z-10 rounded-full bg-gold px-2.5 py-1 text-xs font-medium text-on-gold">
                      Save {money(weekSaving)} weekly
                    </span>
                  ) : null}

                  <ProductThumb productId={product.id} size="tile" />

                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-ink">
                      {product.name}
                    </h3>
                    <p className="tnum mt-2 flex-1">
                      <span className="font-display text-lg font-semibold text-ink">
                        {money(dayRate)}
                      </span>
                      <span className="text-sm text-ink-faint">/day</span>
                    </p>
                    <div className="mt-3">
                      <AddToQuote productId={product.id} available={free} size="sm" label="Add" />
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </Rail>
        </div>
      </section>

      {/* Kit builder ---------------------------------------------------------- */}
      <section id="kit-builder" className="py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading
            align="center"
            eyebrow="Not sure what the job needs?"
            title="Describe it, and we will build the kit"
            body="Lights running off-grid get a generator. Cameras away from a socket get batteries. Everything is filtered to units actually free for your dates."
            className="mb-9"
          />
          <KitFinder />
        </div>
      </section>

      {/* Offers ---------------------------------------------------------------- */}
      {offers.length > 0 ? (
        <section className="py-12 sm:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <SectionHeading
              align="center"
              eyebrow="Rates and agreements"
              title="Better rates, applied automatically"
              body="No codes to remember. The right pricelist is picked at checkout from who you are and when you are hiring."
              className="mb-8"
            />

            <ul className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {offers.map(({ list, percent, upcoming }) => (
                <li key={list.id}>
                  <Card className="card-hover flex h-full flex-col justify-between gap-5 bg-sunken p-6">
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="tnum font-display text-4xl font-semibold text-gold-strong">
                          {percent}%
                        </span>
                        <span className="text-sm font-medium text-ink-soft">
                          {list.segment ? "below standard" : "seasonal"}
                        </span>
                      </div>
                      <p className="mt-3 font-semibold text-ink">{list.name}</p>
                      <p className="mt-1 text-sm text-ink-soft">
                        {list.segment
                          ? `Applied to ${list.segment} customers at checkout.`
                          : "Applied to the categories it covers."}
                      </p>
                    </div>
                    <p className="border-t border-line-strong/50 pt-3 text-xs text-ink-faint">
                      {list.validFrom && list.validTo
                        ? `${upcoming ? "From" : "Until"} ${fmtDateFull(upcoming ? list.validFrom : list.validTo)}`
                        : "Always active"}
                    </p>
                  </Card>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* How it works ---------------------------------------------------------- */}
      <section className="px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-7xl rounded-[28px] bg-sunken px-6 py-12 sm:px-10 sm:py-16">
          <SectionHeading
            align="center"
            eyebrow="How it works"
            title="Renting in three steps"
            className="mb-10"
          />

          <ol className="stagger grid gap-6 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="text-center">
                <span
                  aria-hidden="true"
                  className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-raised text-clay shadow-[var(--shadow-card)]"
                >
                  <step.icon size={28} weight="duotone" />
                </span>
                <p className="tnum mt-4 text-sm font-medium text-gold-strong">Step {index + 1}</p>
                <h3 className="mt-1 font-display text-lg font-semibold text-ink">{step.title}</h3>
                <p className="mx-auto mt-2 max-w-xs text-sm text-ink-soft">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Pricing --------------------------------------------------------------- */}
      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading
            align="center"
            eyebrow="Time-based pricing"
            title="Longer hires cost less, without you asking"
            body="Every item carries an hourly, daily, weekly and monthly rate. The quotation works out the cheapest legitimate combination for the length you actually want."
            className="mb-9"
          />
          <RateLadder products={LADDER_PRODUCTS} />
        </div>
      </section>

      {/* What happens after you book -------------------------------------------- */}
      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
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
              {STAGE_DETAIL.map((stage) => (
                <li key={stage.title} className="reveal">
                  <Card className="flex gap-5 p-6">
                    <span
                      aria-hidden="true"
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-clay-tint text-clay"
                    >
                      <stage.icon size={21} weight="bold" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-display text-xl font-semibold">{stage.title}</h3>
                      <p className="mt-2 text-ink-soft">{stage.body}</p>
                    </div>
                  </Card>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Operations -------------------------------------------------------------- */}
      <section className="px-4 pb-14 sm:px-6">
        <div className="panel-dark mx-auto max-w-7xl overflow-hidden rounded-[28px] p-8 sm:p-14">
          <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div className="max-w-2xl">
              <h2 className="font-display text-2xl font-semibold text-white sm:text-4xl">
                Running the desk, not just the shop.
              </h2>
              <p className="mt-4 text-white/75">
                The same record drives operations: overdue returns, today&rsquo;s collection runs,
                what each pricelist does to margin, and a brief saying what to chase before lunch.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href="/console" size="lg" variant="gold">
                  Operations desk
                  <ArrowRight size={17} weight="bold" aria-hidden="true" />
                </ButtonLink>
                <Link
                  href="/console/reports"
                  className="inline-flex h-12 items-center rounded-full border border-white/30 px-6 font-medium text-white transition-[background-color,border-color,transform] duration-150 ease-[var(--ease-out)] hover:border-white hover:bg-white/10 active:scale-[0.97]"
                >
                  Reports and exports
                </Link>
              </div>
            </div>

            <dl className="grid grid-cols-3 gap-6 lg:grid-cols-1 lg:gap-5">
              <div>
                <dt className="text-sm text-white/60">Booked, 90 days</dt>
                <dd className="tnum font-display text-2xl font-semibold text-gold">
                  {moneyCompact(stats.revenue)}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-white/60">Units on hire</dt>
                <dd className="tnum font-display text-2xl font-semibold text-white">
                  {stats.unitsOnHire}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-white/60">Back on time</dt>
                <dd className="tnum font-display text-2xl font-semibold text-white">
                  {stats.onTimeRate}%
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>
    </>
  );
}
