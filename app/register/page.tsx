import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";
import { currentAccount } from "@/lib/auth/users";

export const metadata: Metadata = {
  title: "Create account",
  description: "Register as a customer to start booking equipment.",
};

export default async function RegisterPage() {
  const account = await currentAccount();
  if (account) redirect(account.role === "end_user" ? "/console" : "/portal");

  return (
    <AuthShell>
      <RegisterForm />
    </AuthShell>
  );
}
