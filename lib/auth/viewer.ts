import { redirect } from "next/navigation";
import { currentAccount, type AccountRow } from "./users";

/**
 * Route guards for the two sides of the app.
 *
 * The portal is a customer's own record, so it reads identity from the session
 * cookie rather than from the URL: nothing a customer can type should change
 * whose orders they are looking at.
 */

/** The signed-in customer. Operators are sent to their own desk. */
export async function requireCustomer(next: string): Promise<AccountRow> {
  const account = await currentAccount();
  if (!account) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (account.role === "end_user") redirect("/console");
  return account;
}

/** The signed-in operator. Customers are sent back to their portal. */
export async function requireOperator(next: string): Promise<AccountRow> {
  const account = await currentAccount();
  if (!account) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (account.role !== "end_user") redirect("/portal");
  return account;
}
