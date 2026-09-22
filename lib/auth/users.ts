import { cookies } from "next/headers";
import type { AccountRow } from "./accounts";
import { findById } from "./accounts";
import { readSession, signSession } from "./crypto";

export const SESSION_COOKIE = "bandobast-session";
const SESSION_DAYS = 14;

/**
 * The session layer. Account storage lives in accounts.ts; it is re-exported
 * here so call sites have one import for "who is signed in and who exists".
 */
export {
  DEMO_PASSWORD,
  authenticate,
  createAccount,
  findByEmail,
  findById,
  hydratePeople,
} from "./accounts";
export type { AccountRow, RegisterInput } from "./accounts";

/* -------------------------------------------------------------------------- */
/* Session                                                                     */
/* -------------------------------------------------------------------------- */

export async function startSession(account: AccountRow): Promise<void> {
  const token = signSession({
    userId: account.id,
    role: account.role,
    exp: Math.floor(Date.now() / 1000) + SESSION_DAYS * 86_400,
  });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

/** The signed-in account, or null. Safe to call from any server component. */
export async function currentAccount(): Promise<AccountRow | null> {
  const jar = await cookies();
  const session = readSession(jar.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  return findById(session.userId);
}
