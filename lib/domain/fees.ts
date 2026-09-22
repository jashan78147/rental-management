import { round2 } from "./pricing";
import type { LateFeeRule, Product, RentalOrder } from "./types";

export interface LateAssessment {
  hoursLate: number;
  daysCharged: number;
  ruleName: string;
  amount: number;
  capped: boolean;
}

/**
 * Late fee for one order, measured against the rule that matches its products.
 * Grace hours are forgiven in full; anything past them rounds up to a day for
 * per-day rules, which is how rental desks actually bill a late return.
 */
export function assessLateFee(
  order: RentalOrder,
  rules: LateFeeRule[],
  products: Product[],
  returnedAt: Date = new Date(),
): LateAssessment | null {
  const due = new Date(order.endsAt);
  const msLate = returnedAt.getTime() - due.getTime();
  if (msLate <= 0) return null;

  const categoryIds = new Set(
    order.lines
      .map((line) => products.find((p) => p.id === line.productId)?.categoryId)
      .filter((id): id is string => Boolean(id)),
  );

  const active = rules.filter((r) => r.isActive);
  const rule =
    active.find((r) => r.categoryId && categoryIds.has(r.categoryId)) ??
    active.find((r) => !r.categoryId);

  if (!rule) return null;

  const hoursLate = msLate / 3_600_000;
  if (hoursLate <= rule.graceHours) return null;

  const billableHours = hoursLate - rule.graceHours;
  const daysCharged = Math.ceil(billableHours / 24);

  let amount: number;
  switch (rule.feeType) {
    case "flat":
      amount = rule.amount;
      break;
    case "percent_of_rental":
      amount = (order.subtotal * rule.amount) / 100;
      break;
    case "per_day":
    default:
      amount = rule.amount * daysCharged;
      break;
  }

  const capped = rule.capAmount != null && amount > rule.capAmount;
  if (capped) amount = rule.capAmount!;

  return {
    hoursLate: Math.round(hoursLate * 10) / 10,
    daysCharged,
    ruleName: rule.name,
    amount: round2(amount),
    capped,
  };
}

export type ReturnRisk = "on_track" | "due_soon" | "overdue";

export interface RiskRow {
  orderId: string;
  reference: string;
  risk: ReturnRisk;
  hoursRemaining: number;
  projectedFee: number;
}

/** Ranked overdue and due-soon list for the operator dashboard. */
export function returnRisk(
  orders: RentalOrder[],
  rules: LateFeeRule[],
  products: Product[],
  now: Date = new Date(),
  dueSoonHours = 48,
): RiskRow[] {
  return orders
    .filter((o) => o.status === "picked_up" || o.status === "confirmed")
    .map((order) => {
      const hoursRemaining = (new Date(order.endsAt).getTime() - now.getTime()) / 3_600_000;
      const risk: ReturnRisk =
        hoursRemaining < 0 ? "overdue" : hoursRemaining <= dueSoonHours ? "due_soon" : "on_track";
      const projectedFee =
        risk === "overdue" ? (assessLateFee(order, rules, products, now)?.amount ?? 0) : 0;

      return {
        orderId: order.id,
        reference: order.reference,
        risk,
        hoursRemaining: Math.round(hoursRemaining * 10) / 10,
        projectedFee,
      };
    })
    .filter((row) => row.risk !== "on_track")
    .sort((a, b) => a.hoursRemaining - b.hoursRemaining);
}

export interface InvoicePlan {
  kind: "deposit" | "full" | "balance";
  label: string;
  amount: number;
  dueDate: string;
}

/**
 * Split an order total into the invoice schedule the operator picked.
 *
 * The instalment here is a share of the rental total, not the refundable
 * security deposit. The security deposit is a separate hold carried on the
 * order (`depositTotal`) and returned to the customer after check-in, so
 * folding it into the payable schedule would both overcharge the invoice run
 * and misreport collected revenue.
 */
export function buildInvoicePlan(
  order: RentalOrder,
  mode: "full_upfront" | "deposit_then_balance",
  instalmentPercent = 30,
): InvoicePlan[] {
  const issueDate = new Date().toISOString().slice(0, 10);

  if (mode === "full_upfront") {
    return [
      {
        kind: "full",
        label: "Full rental amount",
        amount: round2(order.total),
        dueDate: issueDate,
      },
    ];
  }

  const upfront = round2((order.total * instalmentPercent) / 100);
  const balance = round2(order.total - upfront);

  return [
    {
      kind: "deposit",
      label: `First instalment, ${instalmentPercent}% of the rental`,
      amount: upfront,
      dueDate: issueDate,
    },
    {
      kind: "balance",
      label: "Balance before pickup",
      amount: balance,
      dueDate: order.startsAt.slice(0, 10),
    },
  ];
}
