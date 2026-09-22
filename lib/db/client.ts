import { neon } from "@neondatabase/serverless";

/**
 * Vercel's Neon integration injects the connection string automatically. The
 * names differ slightly depending on how the database was attached, so accept
 * any of them rather than making the deployment depend on one spelling.
 */
function connectionString(): string | undefined {
  const named =
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    process.env.DATABASE_URL_UNPOOLED ??
    process.env.POSTGRES_URL_NON_POOLING;

  if (named) return named;

  // Vercel's integration lets you set a custom prefix, which renames the
  // injected variable (STORAGE_URL, MYDB_URL and so on). Rather than depend on
  // the person leaving that field blank, accept any Postgres URL in the
  // environment. Matching on the scheme keeps this from picking up anything
  // that merely ends in _URL.
  for (const value of Object.values(process.env)) {
    if (typeof value === "string" && /^postgres(ql)?:\/\//.test(value)) return value;
  }

  return undefined;
}

export function dbConfigured(): boolean {
  return Boolean(connectionString());
}

type SqlClient = ReturnType<typeof neon>;

let client: SqlClient | null = null;

/** Throws when no database is attached; callers should check `dbConfigured()`. */
export function sql(): SqlClient {
  if (!client) {
    const url = connectionString();
    if (!url) {
      throw new Error(
        "No Postgres connection string. Attach a database in Vercel Storage, or set DATABASE_URL locally.",
      );
    }
    client = neon(url);
  }
  return client;
}
