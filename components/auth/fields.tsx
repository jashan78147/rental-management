"use client";

import { useId, useState, type ComponentProps, type ReactNode } from "react";
import { Eye, EyeSlash } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/format";

const SHELL =
  "flex h-12 items-center gap-2.5 rounded-xl border border-transparent bg-clay-tint px-3.5 transition-[border-color,background-color,box-shadow] duration-150 ease-[var(--ease-out)] focus-within:border-clay focus-within:bg-raised focus-within:shadow-[var(--shadow-card)]";

const CONTROL =
  "min-w-0 flex-1 bg-transparent text-[0.95rem] text-ink outline-none placeholder:text-ink-faint";

export function Field({
  label,
  icon,
  hint,
  invalid,
  className,
  ...props
}: ComponentProps<"input"> & { label: string; icon?: ReactNode; hint?: string; invalid?: boolean }) {
  const id = useId();

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      <div className={cn(SHELL, invalid && "border-rust bg-rust-tint")}>
        {icon ? (
          <span aria-hidden="true" className="shrink-0 text-ink-faint">
            {icon}
          </span>
        ) : null}
        <input id={id} className={CONTROL} aria-invalid={invalid || undefined} {...props} />
      </div>
      {hint ? <p className="text-xs text-ink-faint">{hint}</p> : null}
    </div>
  );
}

/**
 * Password field with a reveal toggle. The toggle is a real button with a
 * label that changes, so it is reachable and announced rather than being a
 * decorative eye that only mouse users can find.
 */
export function PasswordField({
  label,
  icon,
  hint,
  invalid,
  className,
  ...props
}: ComponentProps<"input"> & { label: string; icon?: ReactNode; hint?: string; invalid?: boolean }) {
  const id = useId();
  const [shown, setShown] = useState(false);

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      <div className={cn(SHELL, invalid && "border-rust bg-rust-tint")}>
        {icon ? (
          <span aria-hidden="true" className="shrink-0 text-ink-faint">
            {icon}
          </span>
        ) : null}
        <input
          id={id}
          type={shown ? "text" : "password"}
          className={CONTROL}
          aria-invalid={invalid || undefined}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShown((v) => !v)}
          aria-label={shown ? "Hide password" : "Show password"}
          className="shrink-0 rounded-md p-1 text-ink-faint transition-colors hover:text-clay"
        >
          {shown ? (
            <EyeSlash size={18} weight="bold" aria-hidden="true" />
          ) : (
            <Eye size={18} weight="bold" aria-hidden="true" />
          )}
        </button>
      </div>
      {hint ? <p className="text-xs text-ink-faint">{hint}</p> : null}
    </div>
  );
}
