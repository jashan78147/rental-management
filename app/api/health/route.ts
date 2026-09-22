import { NextResponse } from "next/server";
import { dbConfigured } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Deployment diagnostics. Reports whether a Postgres connection string was
 * found and which build is serving the request, so a misconfigured deployment
 * can be diagnosed without reading the logs.
 *
 * Deliberately exposes no values: booleans, counts and the commit hash only.
 */
export async function GET() {
  const keys = Object.keys(process.env);

  const looksLikePostgres = Object.values(process.env).filter(
    (v) => typeof v === "string" && /^postgres(ql)?:\/\//.test(v),
  ).length;

  let connects = false;
  let reachError: string | null = null;

  if (dbConfigured()) {
    try {
      const { sql } = await import("@/lib/db/client");
      await sql().query("select 1 as ok");
      connects = true;
    } catch (error) {
      reachError = error instanceof Error ? error.message.slice(0, 200) : "unknown";
    }
  }

  return NextResponse.json({
    dbConfigured: dbConfigured(),
    dbConnects: connects,
    dbError: reachError,
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    postgresUrlsInEnv: looksLikePostgres,
    dbRelatedKeyNames: keys.filter((k) => /DATABASE|POSTGRES|^PG|NEON/.test(k)).sort(),
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
    vercelEnv: process.env.VERCEL_ENV ?? "none",
    builtAt: process.env.VERCEL_DEPLOYMENT_ID ? "vercel" : "local",
  });
}
