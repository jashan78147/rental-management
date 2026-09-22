"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { EnvelopeSimple, LockKey, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { Field, PasswordField } from "@/components/auth/fields";
import { Button } from "@/components/ui";
import { loginAction, type AuthState } from "@/lib/auth/actions";

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
          Signing in…
        </>
      ) : (
        "Sign in"
      )}
    </Button>
  );
}

export function LoginForm({
  next,
  demos,
}: {
  next?: string;
  demos: { email: string; label: string; role: string }[];
}) {
  const [state, formAction] = useActionState(loginAction, null as AuthState | null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold text-ink">Welcome back</h1>
      <p className="mt-2 text-ink-soft">Sign in to book kit or run the desk.</p>

      <form action={formAction} className="mt-8 flex flex-col gap-4">
        {next ? <input type="hidden" name="next" value={next} /> : null}

        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          spellCheck={false}
          placeholder="you@company.in"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          invalid={state?.field === "email"}
          icon={<EnvelopeSimple size={18} weight="bold" />}
          required
        />

        <PasswordField
          label="Password"
          name="password"
          autoComplete="current-password"
          placeholder="Your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          invalid={state?.field === "password"}
          icon={<LockKey size={18} weight="bold" />}
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

      {demos.length > 0 ? (
        <div className="mt-8 rounded-xl border border-line bg-raised p-4">
          <p className="text-sm font-medium text-ink">Demo accounts</p>
          <p className="mt-0.5 text-xs text-ink-faint">
            Fills the form above. Every seeded account uses the same password.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {demos.map((demo) => (
              <button
                key={demo.email}
                type="button"
                onClick={() => {
                  setEmail(demo.email);
                  setPassword("demo1234");
                }}
                className="rounded-full border border-line-strong px-3 py-1.5 text-xs font-medium text-ink-soft transition-[color,border-color,transform] duration-150 ease-[var(--ease-out)] hover:border-clay hover:text-clay active:scale-95"
              >
                {demo.label}
                <span className="ml-1.5 text-ink-faint">{demo.role}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <p className="mt-8 text-center text-sm text-ink-soft">
        New here?{" "}
        <Link href="/register" className="font-medium text-clay hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
