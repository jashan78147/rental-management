# Bandobast, rental management

A rental operations platform: customers book their own dates online, and the desk
runs quotations, reservations, handovers, returns, invoicing and reporting from
one record.

Live at **https://rental-management-alpha.vercel.app**

Built for Problem Statement 3 (Rental Management). The operator brand, catalog
and customers are invented; the mechanics are real.

## What it does

**Catalog and availability**
- Products are marked rentable with a unit count, deposit and per hour / day /
  week / month rates.
- Availability is computed per unit against every overlapping reservation, so the
  same generator cannot be sold twice for the same Saturday. Browse it as a list
  or as a three-week occupancy calendar.
- When something is fully booked, the product page offers the next window of the
  same length that is genuinely free.

**Quotation to contract**
- Build a quotation, send it, confirm it. Confirming is the moment stock is
  committed: reservations are written, pickup and return documents are raised,
  the invoice schedule is created and the return reminders are queued.
- Availability is re-checked at confirmation rather than trusting what the
  browser last saw, so two people racing for the last unit cannot both win.
- Customers review, confirm and pay from the portal without the desk chasing them.

**Delivery, in three movements**
- **Reserve** on confirmation, **hand over** against a pickup document, **collect**
  against a return document. Each step moves the stock ledger, so the shelf count
  and the paperwork never drift apart.

**Pricing**
- Multiple pricelists: segment cards (corporate, repeat client), seasonal cards
  with validity windows, and catalog-wide or per-category discount rules.
- Resolution order is segment, then validity, then priority, then specificity
  (product rule beats category rule beats catalog-wide rule).
- Time-dependent pricing finds the **cheapest legitimate combination** for the
  requested length rather than multiplying a day rate. Ten days bills as one week
  plus three days when that is cheaper, and the quotation shows the customer the
  arithmetic and the saving.

**Invoicing**
- Full payment up front, or a first instalment now with the balance due before
  pickup. The refundable security deposit is held separately and never billed.
- Late returns are priced against per-category fee rules with grace hours, a
  per-day or flat or percentage basis, and a cap. They invoice on their own.

**Reminders**
- Customers and the ops team each get their own lead time before a return date.
  The lead time (the "N days") is editable in the console, and changing it
  reschedules reminders already queued against open bookings.

**Reports**
- Total rental revenue, most rented products, top customers, category mix,
  quote-to-order conversion, on-time return rate and the late-return list.
- Every report exports as **PDF, XLSX or CSV** over the same period selector.

**Recommendations, in three places**

1. **Kit builder** on the home page. Describe the job in plain language and it
   assembles a bookable kit from live availability, then tells you what it still
   needs to know.
2. **Cart suggestions.** What this specific order is missing, ranked by
   co-rental affinity across past orders and filtered to units actually free.
3. **Desk brief** on the console dashboard. Two sentences plus up to four things
   to act on before lunch, each naming a real reference, product or customer.

**Each one runs with no API key and no network.** The kit builder is a rule
engine (`lib/ai/rules.ts`): it parses the brief into a structured shape
(duration, job type, indoor or outdoor, headcount, camera count, mains power,
night work, travel) and applies the dependency rules a rental desk applies by
habit. Lights off-grid pull in a generator and distro. Cameras away from a wall
socket pull in batteries. A live crew pulls in comms. Headcount sizes the PA,
the seating and the decking. Power resolves last and is protected from
truncation, so a kit can never quote lights with nothing to run them on. The
cart panel is co-rental affinity, which is ordinary collaborative filtering over
real order history.

Setting `ANTHROPIC_API_KEY` upgrades all three to Claude Opus 5 with structured
outputs, constrained to real product IDs and real free units. The interface is
the same either way, and any API failure falls back to the rules rather than
breaking the page. Nothing here needs a key to demo.

## Running it

```bash
npm install
npm run dev
```

Open http://localhost:3000. No sign-in: the portal has a "viewing as" switcher and
the console is open, because a login wall helps nobody evaluate this.

Copy `.env.example` to `.env.local` to turn on the optional integrations.

## Stack

Next.js 16 (App Router, Server Components, server actions), React 19, TypeScript,
Tailwind v4, Recharts, Phosphor icons, the Anthropic SDK with structured outputs.

## Data

Transactional state lives in Postgres (Neon, attached through Vercel): orders,
lines, reservations, deliveries, invoices, payments, notifications and reminder
lead times. The catalog, pricelists, customers and fee rules stay as constants in
the code because they are configuration rather than state, which keeps every
lookup against them synchronous.

The schema bootstraps itself. On first request the tables are created if absent,
and when the orders table is empty the demo dataset is generated and inserted: 22
products, 5 pricelists, 7 customers and 30 orders spread across the trailing
twelve months, anchored to today so there is always something overdue, something
out with a customer and something upcoming. There is no migration step to run.

With no database attached the app falls back to an in-process copy of the same
dataset. That is right for local development, where there is one server process.
It is **not** sufficient on serverless: each function gets its own copy, so an
order created by the API route is invisible to the page that should display it.
This was measured rather than assumed, and it is why the database exists.

The console dashboard has a **Reset demo data** control that restores the seeded
state, so the same walkthrough can be run twice.

To attach a database: Vercel project, Storage, create a Neon Postgres database,
connect it to the project, redeploy. `GET /api/health` reports whether a
connection string was found, whether it connects, and which commit is serving
the request, without exposing any values.

## Layout

```
app/
  page.tsx            marketing page, kit builder, live rate ladder
  catalog/            browse, filter, availability calendar, product detail
  cart/               quotation builder with AI suggestions
  portal/             customer: rentals, invoices, payments, reminders
  console/            desk: dashboard, orders, collections, fleet,
                      pricelists, invoicing, reminders, reports
  api/                quote, orders, kit endpoints, report exports, health
lib/
  domain/             pricing, availability, fees, quoting, reports (pure,
                      all take their data as arguments)
  data/               seed, dataset assembly, mutations, persistence
  db/                 Postgres client, schema bootstrap, repository
  ai/                 rule engine, co-rental affinity, optional Claude clients
```

## Notes on the numbers

Fleet-wide utilisation is deliberately not a headline metric. Roughly half the
unit count is bulk staging stock that only ships for events, so a single average
reads near zero in any month without a large build. Utilisation is reported per
product on the fleet page, where it is actionable, and the dashboard leads with
units currently on hire instead.
