"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui";
import type { ActionState } from "@/lib/actions";

function Submit({
  label,
  pendingLabel,
  variant = "primary",
  size = "md",
}: {
  label: string;
  pendingLabel: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} size={size} disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  );
}

/**
 * Wraps a server action with inline feedback. The button stays enabled until
 * the request actually starts, and the result is announced politely.
 */
export function ActionForm({
  action,
  label,
  pendingLabel,
  variant = "primary",
  size = "md",
  fields,
  confirm,
}: {
  action: (prev: ActionState | null, formData: FormData) => Promise<ActionState>;
  label: string;
  pendingLabel: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  fields: Record<string, string>;
  confirm?: string;
}) {
  const [state, formAction] = useActionState(action, null);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (confirm && !window.confirm(confirm)) event.preventDefault();
      }}
      className="inline-flex flex-col gap-2"
    >
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}

      <Submit label={label} pendingLabel={pendingLabel} variant={variant} size={size} />

      {state ? (
        <p
          aria-live="polite"
          className={`inline-flex max-w-xs items-start gap-1.5 text-sm ${
            state.ok ? "text-pine" : "text-rust"
          }`}
        >
          {state.ok ? (
            <CheckCircle size={15} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" />
          ) : (
            <WarningCircle size={15} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" />
          )}
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
