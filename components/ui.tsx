import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/format";

/* -------------------------------------------------------------------------- */
/* Button                                                                      */
/* -------------------------------------------------------------------------- */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-[background-color,border-color,color,transform] duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-55";

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-clay text-on-clay hover:bg-clay-hover",
  secondary: "border border-line-strong bg-raised text-ink hover:border-clay hover:text-clay",
  ghost: "text-ink-soft hover:bg-sunken hover:text-ink",
  danger: "border border-rust/40 bg-rust-tint text-rust hover:border-rust",
};

const BUTTON_SIZE: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-[0.95rem]",
  lg: "h-12 px-6 text-base",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md") {
  return cn(BUTTON_BASE, BUTTON_VARIANT[variant], BUTTON_SIZE[size]);
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button className={cn(buttonClass(variant, size), className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <Link className={cn(buttonClass(variant, size), className)} {...props} />;
}

/* -------------------------------------------------------------------------- */
/* Badge                                                                       */
/* -------------------------------------------------------------------------- */

type Tone = "neutral" | "clay" | "pine" | "ochre" | "rust";

const TONE: Record<Tone, string> = {
  neutral: "bg-sunken text-ink-soft border-line",
  clay: "bg-clay-tint text-clay border-clay/25",
  pine: "bg-pine-tint text-pine border-pine/25",
  ochre: "bg-ochre-tint text-ochre border-ochre/25",
  rust: "bg-rust-tint text-rust border-rust/25",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Surfaces                                                                    */
/* -------------------------------------------------------------------------- */

export function Card({ className, children, ...props }: ComponentProps<"div">) {
  return (
    <div className={cn("card", className)} {...props}>
      {children}
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  body,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  body?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-6", className)}>
      <div className="max-w-2xl">
        {eyebrow ? (
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-clay">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-2xl font-semibold sm:text-3xl">{title}</h2>
        {body ? <p className="mt-3 text-ink-soft">{body}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: Tone;
}) {
  const accent =
    tone === "clay"
      ? "text-clay"
      : tone === "pine"
        ? "text-pine"
        : tone === "rust"
          ? "text-rust"
          : tone === "ochre"
            ? "text-ochre"
            : "text-ink";

  return (
    <div className="card p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-ink-faint">{label}</p>
      <p className={cn("tnum mt-2 font-display text-2xl font-semibold", accent)}>{value}</p>
      {hint ? <p className="mt-1 text-sm text-ink-soft">{hint}</p> : null}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      <p className="max-w-sm text-sm text-ink-soft">{body}</p>
      {action}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Form field                                                                  */
/* -------------------------------------------------------------------------- */

export const inputClass =
  "h-10 w-full rounded-lg border border-line-strong bg-raised px-3 text-[0.95rem] text-ink transition-colors placeholder:text-ink-faint hover:border-clay/50";

export function Field({
  label,
  hint,
  htmlFor,
  children,
  className,
}: {
  label: string;
  hint?: string;
  htmlFor: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-ink-faint">{hint}</p> : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Status mapping shared by portal and console                                 */
/* -------------------------------------------------------------------------- */

export const STATUS_TONE: Record<string, Tone> = {
  quotation: "neutral",
  quotation_sent: "ochre",
  confirmed: "clay",
  picked_up: "pine",
  returned: "neutral",
  cancelled: "rust",
  scheduled: "neutral",
  ready: "clay",
  done: "pine",
  late: "rust",
  draft: "neutral",
  sent: "ochre",
  paid: "pine",
  void: "rust",
};

export const STATUS_LABEL: Record<string, string> = {
  quotation: "Draft quotation",
  quotation_sent: "Quotation sent",
  confirmed: "Confirmed",
  picked_up: "With customer",
  returned: "Returned",
  cancelled: "Cancelled",
  scheduled: "Scheduled",
  ready: "Ready",
  done: "Completed",
  late: "Late",
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
  void: "Void",
};

/** A deposit invoice is a first instalment of the rental, not the refundable hold. */
export const INVOICE_KIND_LABEL: Record<string, string> = {
  deposit: "First instalment",
  full: "Full payment",
  balance: "Balance before pickup",
  late_fee: "Late return fee",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TONE[status] ?? "neutral"}>{STATUS_LABEL[status] ?? status}</Badge>;
}
