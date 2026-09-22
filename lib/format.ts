import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const currencyPrecise = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const compact = new Intl.NumberFormat("en-IN", {
  notation: "compact",
  maximumFractionDigits: 1,
  style: "currency",
  currency: "INR",
});

export function money(value: number, precise = false): string {
  return precise ? currencyPrecise.format(value) : currency.format(value);
}

export function moneyCompact(value: number): string {
  return compact.format(value);
}

const dayMonth = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" });
const dayMonthYear = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
});
const dateTime = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});
const timeOnly = new Intl.DateTimeFormat("en-IN", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

export function fmtDate(iso: string): string {
  return dayMonth.format(new Date(iso));
}

export function fmtDateFull(iso: string): string {
  return dayMonthYear.format(new Date(iso));
}

export function fmtDateTime(iso: string): string {
  return dateTime.format(new Date(iso));
}

export function fmtTime(iso: string): string {
  return timeOnly.format(new Date(iso));
}

export function fmtRange(startIso: string, endIso: string): string {
  return `${fmtDate(startIso)} to ${fmtDate(endIso)}`;
}

/** "in 3 days", "2 hours ago". Kept deliberately coarse so it never looks fake-precise. */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const diffMs = new Date(iso).getTime() - now.getTime();
  const rtf = new Intl.RelativeTimeFormat("en-IN", { numeric: "auto" });
  const hours = diffMs / 3_600_000;

  if (Math.abs(hours) < 1) return rtf.format(Math.round(diffMs / 60_000), "minute");
  if (Math.abs(hours) < 36) return rtf.format(Math.round(hours), "hour");
  return rtf.format(Math.round(hours / 24), "day");
}

export function durationLabel(startIso: string, endIso: string): string {
  const hours = Math.max(
    1,
    Math.ceil((new Date(endIso).getTime() - new Date(startIso).getTime()) / 3_600_000),
  );
  if (hours < 24) return `${hours} hours`;
  const days = Math.round(hours / 24);
  if (days < 14) return `${days} days`;
  const weeks = Math.round(days / 7);
  if (weeks < 9) return `${weeks} weeks`;
  return `${Math.round(days / 30)} months`;
}

/** Local datetime value an <input type="datetime-local"> will accept. */
export function toLocalInput(iso: string): string {
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function fromLocalInput(value: string): string {
  return new Date(value).toISOString();
}
