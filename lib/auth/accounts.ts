/**
 * Account storage: the accounts table, its in-memory fallback and the lookups
 * over it. Deliberately free of `next/headers`, because the data layer warms
 * the people registry from here and must stay importable outside a request.
 * The session lives next door in users.ts.
 */
import { dbConfigured, sql } from "@/lib/db/client";
import { ensureReady } from "@/lib/db/repo";
import { profiles } from "@/lib/data/seed";
import { upsertPerson } from "@/lib/data/people";
import type { AppRole, CustomerSegment } from "@/lib/domain/types";
import { hashPassword, verifyPassword } from "./crypto";

/** Every seeded person can be signed in as, so a demo never needs a signup. */
export const DEMO_PASSWORD = "demo1234";

export interface AccountRow {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: AppRole;
  segment: CustomerSegment;
  city?: string;
  createdAt: string;
  passwordHash: string;
}

/**
 * Publish the account to the people registry, so every synchronous
 * `profileById` lookup in the console, the invoices and the reports can name a
 * self-registered customer. Called on every path that materialises a row.
 */
function publish(account: AccountRow): AccountRow {
  upsertPerson({
    id: account.id,
    fullName: account.fullName,
    email: account.email,
    phone: account.phone,
    role: account.role,
    segment: account.segment,
    city: account.city,
    createdAt: account.createdAt,
  });
  return account;
}

type Row = Record<string, unknown>;

const DDL = `create table if not exists accounts (
  id text primary key,
  email text not null unique,
  full_name text not null,
  phone text,
  role text not null default 'customer',
  segment text not null default 'retail',
  city text,
  password_hash text not null,
  created_at timestamptz not null default now()
)`;

let ready: Promise<void> | null = null;

/**
 * Create the table and give every seeded profile a sign-in, so the demo
 * accounts on the login page are real rows rather than a special case in the
 * login path.
 */
async function bootstrapAccounts(): Promise<void> {
  const db = sql();
  await ensureReady();
  await db.query(DDL);

  const [{ count }] = (await db.query("select count(*)::int as count from accounts")) as Row[];
  if (Number(count) > 0) return;

  const hash = hashPassword(DEMO_PASSWORD);
  for (const profile of profiles) {
    await db.query(
      `insert into accounts (id, email, full_name, phone, role, segment, city, password_hash)
       values ($1,$2,$3,$4,$5,$6,$7,$8) on conflict (email) do nothing`,
      [
        profile.id,
        profile.email.toLowerCase(),
        profile.fullName,
        profile.phone ?? null,
        profile.role,
        profile.segment,
        profile.city ?? null,
        hash,
      ],
    );
  }
}

async function accountsReady(): Promise<void> {
  if (!ready) {
    ready = bootstrapAccounts().catch((error) => {
      ready = null;
      throw error;
    });
  }
  return ready;
}

/** In-memory fallback so local development works with no database attached. */
declare global {
  var __bandobastAccounts: Map<string, AccountRow> | undefined;
}

function memoryAccounts(): Map<string, AccountRow> {
  if (!globalThis.__bandobastAccounts) {
    const hash = hashPassword(DEMO_PASSWORD);
    globalThis.__bandobastAccounts = new Map(
      profiles.map((profile) => [
        profile.email.toLowerCase(),
        {
          id: profile.id,
          email: profile.email.toLowerCase(),
          fullName: profile.fullName,
          phone: profile.phone,
          role: profile.role,
          segment: profile.segment,
          city: profile.city,
          createdAt: profile.createdAt,
          passwordHash: hash,
        },
      ]),
    );
  }
  return globalThis.__bandobastAccounts;
}

function toAccount(row: Row): AccountRow {
  return {
    id: String(row.id),
    email: String(row.email),
    fullName: String(row.full_name),
    phone: row.phone == null ? undefined : String(row.phone),
    role: String(row.role) as AppRole,
    segment: String(row.segment) as CustomerSegment,
    city: row.city == null ? undefined : String(row.city),
    createdAt: row.created_at ? new Date(String(row.created_at)).toISOString() : new Date().toISOString(),
    passwordHash: String(row.password_hash),
  };
}

export async function findByEmail(email: string): Promise<AccountRow | null> {
  const key = email.trim().toLowerCase();

  if (!dbConfigured()) {
    const hit = memoryAccounts().get(key);
    return hit ? publish(hit) : null;
  }

  await accountsReady();
  const rows = (await sql().query("select * from accounts where email = $1", [key])) as Row[];
  return rows[0] ? publish(toAccount(rows[0])) : null;
}

export async function findById(id: string): Promise<AccountRow | null> {
  if (!dbConfigured()) {
    const hit = [...memoryAccounts().values()].find((a) => a.id === id);
    return hit ? publish(hit) : null;
  }

  await accountsReady();
  const rows = (await sql().query("select * from accounts where id = $1", [id])) as Row[];
  return rows[0] ? publish(toAccount(rows[0])) : null;
}

/**
 * Warm the people registry from the accounts table. Called once per dataset
 * load, so any page showing orders can name whoever raised them.
 */
export async function hydratePeople(): Promise<void> {
  if (!dbConfigured()) {
    for (const account of memoryAccounts().values()) publish(account);
    return;
  }

  try {
    await accountsReady();
    const rows = (await sql().query(
      "select id, email, full_name, phone, role, segment, city, created_at, '' as password_hash from accounts",
    )) as Row[];
    for (const row of rows) publish(toAccount(row));
  } catch {
    // The registry falls back to the seeded people. A name missing from the
    // desk is not a reason to fail the page.
  }
}

export interface RegisterInput {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
}

export async function createAccount(
  input: RegisterInput,
): Promise<{ ok: boolean; account?: AccountRow; error?: string }> {
  const email = input.email.trim().toLowerCase();

  if (await findByEmail(email)) {
    return { ok: false, error: "An account with that email already exists. Sign in instead." };
  }

  const account: AccountRow = {
    id: `u-${Date.now().toString(36)}`,
    email,
    fullName: input.fullName.trim(),
    phone: input.phone?.trim() || undefined,
    // Anyone registering is a customer. Operator accounts are provisioned, not
    // self-served, which is what "end user" means in the problem statement.
    role: "customer",
    segment: "retail",
    createdAt: new Date().toISOString(),
    passwordHash: hashPassword(input.password),
  };

  if (!dbConfigured()) {
    memoryAccounts().set(email, account);
    return { ok: true, account: publish(account) };
  }

  await accountsReady();
  await sql().query(
    `insert into accounts (id, email, full_name, phone, role, segment, city, password_hash)
     values ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      account.id,
      account.email,
      account.fullName,
      account.phone ?? null,
      account.role,
      account.segment,
      account.city ?? null,
      account.passwordHash,
    ],
  );

  return { ok: true, account: publish(account) };
}

export async function authenticate(
  email: string,
  password: string,
): Promise<{ ok: boolean; account?: AccountRow; error?: string }> {
  const account = await findByEmail(email);

  // Same message either way, so the form cannot be used to discover which
  // email addresses have accounts.
  if (!account || !verifyPassword(password, account.passwordHash)) {
    return { ok: false, error: "That email and password do not match an account." };
  }

  return { ok: true, account };
}
