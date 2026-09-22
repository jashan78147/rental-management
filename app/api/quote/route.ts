import { NextResponse } from "next/server";
import { z } from "zod";
import { currentAccount } from "@/lib/auth/users";
import { buildQuote } from "@/lib/domain/quote";
import { loadDataset } from "@/lib/data/persist";

export const runtime = "nodejs";

const Body = z.object({
  items: z
    .array(z.object({ productId: z.string(), quantity: z.number().int().min(1).max(200) }))
    .max(40),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  /** Honoured for the desk only. A customer is always priced as themselves. */
  customerId: z.string().optional(),
});

export async function POST(request: Request) {
  let parsed;
  try {
    parsed = Body.safeParse(await request.json());
  } catch {
    return NextResponse.json({ error: "Send a JSON body." }, { status: 400 });
  }

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid quote request." }, { status: 400 });
  }

  if (new Date(parsed.data.endsAt) <= new Date(parsed.data.startsAt)) {
    return NextResponse.json(
      { error: "The return date has to be after the pickup date." },
      { status: 400 },
    );
  }

  // Pricing follows a customer's segment, so a signed-out visitor sees retail
  // and nobody can price themselves onto another account's rate card.
  const account = await currentAccount();
  const customerId =
    account?.role === "end_user" ? parsed.data.customerId : (account?.id ?? undefined);

  const store = await loadDataset();
  return NextResponse.json(
    buildQuote({ ...parsed.data, customerId, reservations: store.reservations }),
  );
}
