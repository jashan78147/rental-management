import { NextResponse } from "next/server";
import { z } from "zod";
import { currentAccount } from "@/lib/auth/users";
import { createOrder } from "@/lib/data/mutations";

export const runtime = "nodejs";

const Body = z.object({
  items: z
    .array(z.object({ productId: z.string(), quantity: z.number().int().min(1).max(200) }))
    .min(1)
    .max(40),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  /** Honoured for the desk only. A customer always bills to themselves. */
  customerId: z.string().optional(),
  notes: z.string().max(600).optional(),
});

export async function POST(request: Request) {
  const account = await currentAccount();
  if (!account) {
    return NextResponse.json({ error: "Sign in to send a quotation." }, { status: 401 });
  }

  let parsed;
  try {
    parsed = Body.safeParse(await request.json());
  } catch {
    return NextResponse.json({ error: "Send a JSON body." }, { status: 400 });
  }

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Add at least one item before sending the quotation." },
      { status: 400 },
    );
  }

  // Whose booking this is comes from the session, never from the request body.
  // The desk may name a customer; anyone else gets their own id regardless of
  // what they sent.
  const customerId =
    account.role === "end_user" ? (parsed.data.customerId ?? account.id) : account.id;

  const result = await createOrder({ ...parsed.data, customerId });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, shortages: result.shortages },
      { status: 409 },
    );
  }

  return NextResponse.json({ order: result.order }, { status: 201 });
}
