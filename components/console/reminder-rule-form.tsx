"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui";
import { updateReminderLeadAction, type ActionState } from "@/lib/actions";

function Save() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" size="sm" disabled={pending}>
      {pending ? "Saving…" : "Save"}
    </Button>
  );
}

export function ReminderRuleForm({
  ruleId,
  leadDays,
  isActive,
  event,
}: {
  ruleId: string;
  leadDays: number;
  isActive: boolean;
  event: string;
}) {
  const [state, formAction] = useActionState(updateReminderLeadAction, null as ActionState | null);
  const [days, setDays] = useState(leadDays);

  const leadId = `lead-${ruleId}`;
  const activeId = `active-${ruleId}`;

  return (
    <form action={formAction} className="mt-4 border-t border-line pt-4">
      <input type="hidden" name="ruleId" value={ruleId} />

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={leadId} className="text-sm font-medium text-ink">
            Lead time
          </label>
          <div className="flex items-center gap-2">
            <input
              id={leadId}
              name="leadDays"
              type="number"
              inputMode="numeric"
              min={0}
              max={30}
              value={days}
              onChange={(e) => setDays(Math.max(0, Math.min(30, Number(e.target.value) || 0)))}
              className="tnum h-9 w-20 rounded-lg border border-line-strong bg-raised px-3 text-center text-sm"
            />
            <span className="text-sm text-ink-soft">
              day{days === 1 ? "" : "s"}{" "}
              {event === "overdue" ? "after due" : "before"}
            </span>
          </div>
        </div>

        <label
          htmlFor={activeId}
          className="flex h-9 cursor-pointer items-center gap-2 text-sm text-ink"
        >
          <input
            id={activeId}
            name="isActive"
            type="checkbox"
            defaultChecked={isActive}
            className="h-4 w-4 accent-[var(--clay)]"
          />
          Active
        </label>

        <Save />
      </div>

      {state ? (
        <p
          aria-live="polite"
          className={`mt-3 inline-flex items-start gap-1.5 text-sm ${
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
