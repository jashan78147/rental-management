import { requireCustomer } from "@/lib/auth/viewer";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  // Each page re-reads the viewer for its own data, but the layout guards the
  // whole section so an unauthenticated request never renders any of it.
  await requireCustomer("/portal");
  return <>{children}</>;
}
