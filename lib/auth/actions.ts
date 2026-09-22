"use server";

import { redirect } from "next/navigation";
import { authenticate, createAccount, endSession, startSession } from "./users";

export interface AuthState {
  ok: boolean;
  message: string;
  /** Which field to focus and mark, so errors land where the mistake is. */
  field?: "email" | "password" | "confirm" | "fullName";
}

/** Only ever send people to paths inside this app. */
function safeRedirect(target: string | null, fallback: string): string {
  if (!target || !target.startsWith("/") || target.startsWith("//")) return fallback;
  return target;
}

export async function loginAction(
  _prev: AuthState | null,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeRedirect(formData.get("next") as string | null, "/portal");

  if (!email || !password) {
    return { ok: false, message: "Enter your email and password.", field: "email" };
  }

  const result = await authenticate(email, password);
  if (!result.ok || !result.account) {
    return { ok: false, message: result.error ?? "Could not sign you in.", field: "password" };
  }

  await startSession(result.account);
  redirect(result.account.role === "end_user" ? "/console" : next);
}

export async function registerAction(
  _prev: AuthState | null,
  formData: FormData,
): Promise<AuthState> {
  const fullName = `${String(formData.get("firstName") ?? "").trim()} ${String(
    formData.get("lastName") ?? "",
  ).trim()}`.trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (!fullName) {
    return { ok: false, message: "Tell us your name.", field: "fullName" };
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, message: "That email address does not look right.", field: "email" };
  }
  if (password.length < 8) {
    return { ok: false, message: "Use at least 8 characters.", field: "password" };
  }
  if (password !== confirm) {
    return { ok: false, message: "The two passwords do not match.", field: "confirm" };
  }

  const result = await createAccount({ fullName, email, phone, password });
  if (!result.ok || !result.account) {
    return { ok: false, message: result.error ?? "Could not create that account.", field: "email" };
  }

  await startSession(result.account);
  redirect("/portal");
}

export async function logoutAction(): Promise<void> {
  await endSession();
  redirect("/");
}
