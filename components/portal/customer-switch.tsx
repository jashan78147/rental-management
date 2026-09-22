"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { UserCircle } from "@phosphor-icons/react/dist/ssr";
import { SEGMENT_LABEL } from "@/lib/data/seed";
import type { Profile } from "@/lib/domain/types";

/**
 * This build has no sign-in, so the portal needs a way to say who is looking.
 * The choice rides in the URL rather than a cookie, which keeps every portal
 * page shareable and server rendered.
 */
export function CustomerSwitch({
  customers,
  currentId,
}: {
  customers: Profile[];
  currentId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <UserCircle size={18} weight="bold" className="text-ink-faint" aria-hidden="true" />
      <label htmlFor="portal-customer" className="text-sm text-ink-soft">
        Viewing as
      </label>
      <select
        id="portal-customer"
        value={currentId}
        onChange={(event) => {
          const next = new URLSearchParams(params.toString());
          next.set("as", event.target.value);
          router.push(`${pathname}?${next.toString()}`);
        }}
        className="h-9 rounded-lg border border-line-strong px-2.5 text-sm"
        style={{ backgroundColor: "var(--paper-raised)", color: "var(--ink)" }}
      >
        {customers.map((customer) => (
          <option key={customer.id} value={customer.id}>
            {customer.fullName} ({SEGMENT_LABEL[customer.segment]})
          </option>
        ))}
      </select>
    </div>
  );
}
