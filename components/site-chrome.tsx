"use client";

import { usePathname } from "next/navigation";

/** Hides the footer on the full-bleed auth screens. */
export function FooterSlot({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/login") || pathname.startsWith("/register")) return null;
  return <>{children}</>;
}
