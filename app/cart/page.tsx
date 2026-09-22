import type { Metadata } from "next";
import { CartView, type CartPerson } from "@/components/cart/cart-view";
import { currentAccount } from "@/lib/auth/users";
import { hydratePeople } from "@/lib/auth/accounts";
import { customers } from "@/lib/data/people";

export const metadata: Metadata = { title: "Quotation" };

/**
 * The cart itself lives in the browser, but who it bills to comes from the
 * session. A customer cannot pick someone else to bill; the desk can, because
 * raising a quotation on a customer's behalf is its job.
 */
export default async function CartPage() {
  const account = await currentAccount();
  const isOperator = account?.role === "end_user";

  // The desk lists everyone who can be billed, including self-registered
  // customers, so the registry has to be warm before it is read.
  if (isOperator) await hydratePeople();

  const deskCustomers: CartPerson[] = isOperator
    ? customers().map((person) => ({
        id: person.id,
        name: person.fullName,
        segment: person.segment,
      }))
    : [];

  return (
    <CartView
      viewer={
        account
          ? {
              id: account.id,
              name: account.fullName,
              email: account.email,
              segment: account.segment,
              isOperator,
            }
          : null
      }
      customers={deskCustomers}
    />
  );
}
