import { NextResponse } from "next/server";
import { z } from "zod";
import { searchKit } from "@/lib/ai/search";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  query: z.string().min(3).max(600),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
});

function defaultWindow() {
  const start = new Date();
  start.setDate(start.getDate() + 3);
  start.setHours(9, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 3);
  return { startsAt: start.toISOString(), endsAt: end.toISOString() };
}

export async function POST(request: Request) {
  let parsed;
  try {
    parsed = Body.safeParse(await request.json());
  } catch {
    return NextResponse.json({ error: "Send a JSON body with a query field." }, { status: 400 });
  }

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Describe the job in at least a few words so the kit can be built." },
      { status: 400 },
    );
  }

  const fallback = defaultWindow();
  const result = await searchKit({
    query: parsed.data.query,
    startsAt: parsed.data.startsAt ?? fallback.startsAt,
    endsAt: parsed.data.endsAt ?? fallback.endsAt,
  });

  return NextResponse.json(result);
}
