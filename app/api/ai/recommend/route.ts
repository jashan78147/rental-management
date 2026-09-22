import { NextResponse } from "next/server";
import { z } from "zod";
import { recommendKit } from "@/lib/ai/recommend";
import { loadDataset } from "@/lib/data/persist";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  productIds: z.array(z.string()).min(1).max(30),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
});

export async function POST(request: Request) {
  let parsed;
  try {
    parsed = Body.safeParse(await request.json());
  } catch {
    return NextResponse.json({ error: "Send a JSON body." }, { status: 400 });
  }

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid recommendation request." }, { status: 400 });
  }

  const result = await recommendKit({
    store: await loadDataset(),
    cartProductIds: parsed.data.productIds,
    startsAt: parsed.data.startsAt,
    endsAt: parsed.data.endsAt,
  });

  return NextResponse.json(result);
}
