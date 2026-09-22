import { NextResponse } from "next/server";
import { z } from "zod";
import { createOrder } from "@/lib/data/mutations";

export const runtime = "nodejs";

const Body = z.object({
  items: z
    .array(z.object({ productId: z.string(), quantity: z.number().int().min(1).max(200) }))
    .min(1)
    .max(40),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  customerId: z.string(),
  notes: z.string().max(600).optional(),
});

export async function POST(request: Request) {
  let parsed;
  try {
    parsed = Body.safeParse(await request.json());
  } catch {
    return NextResponse.json({ error: "Send a JSON body." }, { status: 400 });
  }

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Add at least one item and pick a customer before sending the quotation." },
      { status: 400 },
    );
  }

  const result = await createOrder(parsed.data);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, shortages: result.shortages },
      { status: 409 },
    );
  }

  return NextResponse.json({ order: result.order }, { status: 201 });
}
