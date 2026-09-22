import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { profiles } from "@/lib/data/seed";
import { currentAccount } from "@/lib/auth/users";
import { firstParam } from "@/lib/window";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to book equipment or run the rental desk.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** A few seeded people, so a first-time visitor is never stuck at the door. */
const DEMOS = [
  profiles.find((p) => p.role === "end_user"),
  profiles.find((p) => p.id === "u-ritwika"),
  profiles.find((p) => p.id === "u-aarav"),
]
  .filter((p): p is NonNullable<typeof p> => Boolean(p))
  .map((p) => ({
    email: p.email,
    label: p.fullName,
    role: p.role === "end_user" ? "operator" : "customer",
  }));

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const account = await currentAccount();
  if (account) redirect(account.role === "end_user" ? "/console" : "/portal");

  const params = await searchParams;
  return (
    <AuthShell>
      <LoginForm next={firstParam(params.next)} demos={DEMOS} />
    </AuthShell>
  );
}
