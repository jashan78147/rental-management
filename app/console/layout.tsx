import type { Metadata } from "next";
import { ConsoleNav } from "@/components/console/console-nav";
import { requireOperator } from "@/lib/auth/viewer";

export const metadata: Metadata = {
  title: { default: "Operations", template: "%s | Operations" },
  description: "Rental desk: orders, collections, pricelists, invoicing and reports.",
};

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  // The desk is for operators. Customers who wander in land in their portal
  // rather than on an error page.
  await requireOperator("/console");

  return (
    <div className="mx-auto max-w-[110rem] px-4 py-8 sm:px-6">
      <div className="lg:grid lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-8">
        <ConsoleNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
