# Demo script

Live: **https://rental-management-alpha.vercel.app**

Five minutes, eleven clicks, covering every area of the problem statement. Run it
from localhost if you can (faster, no cold start); the deployed site is the
fallback and the submission link.

**Before you start:** open the console dashboard, scroll to the bottom, click
**Reset demo data**. Takes about eight seconds and puts every order, invoice and
reminder back to its seeded state. Do this between run-throughs too.

The seed is anchored to today, so there is always something overdue, something
out with a customer and something upcoming. Exact figures below will differ from
whatever your screen shows; the shapes will not.

---

## The 5-minute path

### 1. Home, kit builder (45s)

Click the first example chip: *"Three day outdoor shoot near Lonavala, two camera
crew, no mains power"*.

> "You describe the job, not part numbers. It reads three days, two camera
> angles, outdoors, no mains power."

Point at the **generator and the distro box** in the result.

> "Nobody asked for a generator. It inferred that from 'no mains power' plus the
> fact that it just specced two lights. Same reason there are batteries in there:
> cameras away from a wall socket. Every suggestion is filtered to units actually
> free for those dates."

This is the line that lands: **the kit it builds would actually work on the day.**

### 2. Rate ladder, same page (30s)

Scroll to **Rates that follow the clock**. Drag the slider to **10 days**.

> "One rate card: hour, day, week, month. For ten days it does not multiply the
> day rate. It works out that a week plus three days is cheaper and bills that."

Point at the saving figure. Drag to 4 days to show it flip back to plain day
rate when that is genuinely cheapest.

### 3. Catalog, calendar view (30s)

**Catalog** → **Calendar** toggle.

> "Availability per unit per day, counted against every overlapping reservation.
> This is what stops the same generator being sold twice for the same Saturday."

### 4. The shortage case (40s)

Set the window to roughly **five to eight days out**. Add **2 × Line Array PA**
to the quote, then open the cart.

> "There are two in the fleet and one is already committed that week. It does not
> just say unavailable, it tells you when the same length of hire is free."

Point at the suggested alternative window.

### 5. Cart, pricing and suggestions (45s)

With a camera package in the cart, switch **Billing to** between a retail
customer and a corporate one.

> "Same kit, same dates. The pricelist follows the customer segment, and the
> quote says which card priced it."

Point at the AI suggestion panel.

> "Ranked by what previous orders actually put on the truck alongside these
> items. That is real co-rental history, not a guess."

Click **Send quotation**.

### 6. Portal, confirm and pay (40s)

You land on the customer's view of the quotation.

> "Nothing is reserved yet. This is the customer's own portal, they review and
> confirm without the desk chasing them."

Click **Confirm and reserve**.

> "That one click did five things: reserved every unit for the window, raised a
> pickup document and a return document, created the invoice schedule, and queued
> the return reminders."

Point at the invoice split.

> "First instalment now, balance before pickup. The refundable security deposit is
> held separately and never billed, which is the part most systems get wrong."

### 7. Console, the desk brief (30s)

**Operations** → dashboard.

> "This is the morning brief. It names the actual overdue reference, the actual
> hours past due and the fee accrued so far."

Point at **Return risk** and the overdue order.

### 8. Collections, check in a late return (40s)

**Collections** → find the overdue row → **Check in**.

> "The return was late, so the system prices it against the fee rules for that
> category: grace hours forgiven, then per day, capped. It raises that as its own
> invoice rather than burying it in the rental total."

Open the order to show the late fee invoice.

### 9. Reminders, the configurable N (30s)

**Reminders**. Change the customer rule's lead time from **3 days to 5**, save.

> "Customers and the ops team each get their own lead time. Changing it
> reschedules reminders already queued against open bookings, not just future
> ones."

Point at the confirmation: *"N queued reminders rescheduled."*

### 10. Reports and exports (30s)

**Reports**.

> "Revenue over the period, most rented by revenue, top customers, category mix,
> on-time return rate, and the late return list."

Click **PDF**. Let it download in front of them.

> "Same data as XLSX and CSV, over the same period selector."

### 11. Close (20s)

> "Quotation to contract, reservation to handover to collection, invoicing with
> deposits and late fees, pricelists that follow the clock and the customer, and
> reminders on both sides. Running on Postgres, deployed, and the recommendation
> engine needs no API key to work."

---

## If they ask

**"Is the AI real?"**
Be straight: the kit builder is a rule engine, in `lib/ai/rules.ts`. It parses the
brief into a structured shape and applies dependency rules. The cart panel is
co-rental affinity, which is collaborative filtering over real order history.
Both are inspectable, neither can rate-limit mid-demo. Setting
`ANTHROPIC_API_KEY` upgrades all three surfaces to Claude behind the same
interface. Saying this plainly is stronger than claiming a model you are not
calling.

**"What happens if two people book the last unit at once?"**
Availability is re-checked at confirmation, not trusted from the browser. The
second one gets told stock was committed elsewhere. `lib/data/mutations.ts`.

**"Why is fleet utilisation low?"**
Because half the unit count is bulk staging that only ships for events. A single
fleet average is a misleading number, so the dashboard leads with units currently
on hire and utilisation is reported per product on the Fleet page, where it is
actionable.

**"How does the pricing actually decide?"**
A small dynamic program over the hour axis, so it is the cheapest legitimate
combination rather than a greedy guess. `cheapestChunks` in
`lib/domain/pricing.ts`. Pricelists resolve per unit rate across every eligible
list, so a seasonal card that only covers staging does not blank out camera
rates.

**"Is this real data?"**
No, and say so. The operator, catalog and customers are invented. The mechanics
are real.

---

## Things not to do on stage

- Do not open the cart with an empty quote and expect the AI panel; it needs
  items to work from.
- Do not demo the payment as if money moves. It records a gateway reference
  against the invoice; the gateway is in test mode.
- Do not click **Reset demo data** mid-run. It wipes the order you just created.
