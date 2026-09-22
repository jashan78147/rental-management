import type { Metadata } from "next";
import { ConsoleNav } from "@/components/console/console-nav";

export const metadata: Metadata = {
  title: { default: "Operations", template: "%s | Operations" },
  description: "Rental desk: orders, collections, pricelists, invoicing and reports.",
};

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[110rem] px-4 py-8 sm:px-6">
      <div className="lg:grid lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-8">
        <ConsoleNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
