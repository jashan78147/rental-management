import type { Profile } from "@/lib/domain/types";
import { profiles as profileSeeds } from "./seed";

/**
 * Who a customer id belongs to.
 *
 * The seeded people ship with the code, but anyone can register, and an order
 * raised by a self-registered customer still has to show a name on the desk,
 * on their invoice and in the reports. Those lookups are synchronous and sit
 * inside render paths, so account rows are merged into this registry as they
 * are read rather than awaited at each call site.
 *
 * Nothing here is authoritative: the accounts table is. This is a read cache
 * that the auth layer keeps warm.
 */
declare global {
  var __bandobastPeople: Map<string, Profile> | undefined;
}

function registry(): Map<string, Profile> {
  if (!globalThis.__bandobastPeople) {
    globalThis.__bandobastPeople = new Map(profileSeeds.map((p) => [p.id, p]));
  }
  return globalThis.__bandobastPeople;
}

export function personById(id: string): Profile | undefined {
  return registry().get(id);
}

export function upsertPerson(person: Profile): void {
  registry().set(person.id, person);
}

/** Every person known right now. Seeded people first, in their seeded order. */
export function allPeople(): Profile[] {
  const known = registry();
  const seeded = profileSeeds.map((p) => known.get(p.id) ?? p);
  const seededIds = new Set(profileSeeds.map((p) => p.id));
  const rest = [...known.values()].filter((p) => !seededIds.has(p.id));
  return [...seeded, ...rest];
}

export function customers(): Profile[] {
  return allPeople().filter((p) => p.role === "customer");
}
