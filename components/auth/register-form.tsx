"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  EnvelopeSimple,
  LockKey,
  Phone,
  User,
  WarningCircle,
} from "@phosphor-icons/react/dist/ssr";
import { Field, PasswordField } from "@/components/auth/fields";
import { Button } from "@/components/ui";
import { registerAction, type AuthState } from "@/lib/auth/actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="mt-1 w-full" disabled={pending}>
      {pending ? (
        <>
          <span
            aria-hidden="true"
            className="h-4 w-4 animate-spin rounded-full border-2 border-on-clay/30 border-t-on-clay"
          />
          Creating your account…
        </>
      ) : (
        "Register"
      )}
    </Button>
  );
}

export function RegisterForm() {
  const [state, formAction] = useActionState(registerAction, null as AuthState | null);

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold text-ink">Create account</h1>
      <p className="mt-2 text-ink-soft">Register as a customer to start booking kit.</p>

      <form action={formAction} className="mt-8 flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="First name"
            name="firstName"
            autoComplete="given-name"
            placeholder="Jashanpreet"
            invalid={state?.field === "fullName"}
            icon={<User size={18} weight="bold" />}
            required
          />
          <Field
            label="Last name"
            name="lastName"
            autoComplete="family-name"
            placeholder="Singh"
            icon={<User size={18} weight="bold" />}
          />
        </div>

        <Field
          label="Email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          spellCheck={false}
          placeholder="you@company.in"
          invalid={state?.field === "email"}
          icon={<EnvelopeSimple size={18} weight="bold" />}
          required
        />

        <Field
          label="Phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          spellCheck={false}
          placeholder="Optional, for collection reminders"
          icon={<Phone size={18} weight="bold" />}
        />

        <PasswordField
          label="Password"
          name="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          hint="Eight characters minimum. Longer beats complicated."
          invalid={state?.field === "password"}
          icon={<LockKey size={18} weight="bold" />}
          minLength={8}
          required
        />

        <PasswordField
          label="Confirm password"
          name="confirmPassword"
          autoComplete="new-password"
          placeholder="Type it again"
          invalid={state?.field === "confirm"}
          icon={<LockKey size={18} weight="bold" />}
          minLength={8}
          required
        />

        {state && !state.ok ? (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-lg bg-rust-tint px-3 py-2 text-sm text-rust"
          >
            <WarningCircle size={16} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" />
            {state.message}
          </p>
        ) : null}

        <Submit />
      </form>

      <p className="mt-8 text-center text-sm text-ink-soft">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-clay hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
