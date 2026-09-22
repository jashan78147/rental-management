import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, JetBrains_Mono, Karla } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { CartProvider } from "@/components/cart-provider";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { BRAND } from "@/lib/data/seed";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const karla = Karla({
  subsets: ["latin"],
  variable: "--font-karla",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-face",
  display: "swap",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: {
    default: `${BRAND.name} Rental Management`,
    template: `%s | ${BRAND.name}`,
  },
  description:
    "Quotations, reservations, pickup and return scheduling, flexible invoicing and time-based pricing for a rental fleet, with a customer booking portal.",
};

/**
 * Every surface reads live order, reservation and invoice state that changes
 * through server actions, so nothing here may be frozen at build time.
 */
export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf7f2" },
    { media: "(prefers-color-scheme: dark)", color: "#141210" },
  ],
};

/** Applies the stored theme before paint so the page never flashes the wrong one. */
const themeScript = `
try {
  var stored = localStorage.getItem("bandobast-theme");
  if (stored === "dark" || stored === "light") {
    document.documentElement.setAttribute("data-theme", stored);
  }
} catch (e) {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://picsum.photos" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${bricolage.variable} ${karla.variable} ${mono.variable} antialiased`}
      >
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-clay focus:px-4 focus:py-2 focus:text-on-clay"
        >
          Skip to content
        </a>
        <NuqsAdapter>
          <CartProvider>
            <SiteHeader />
            <main id="main">{children}</main>
            <SiteFooter />
          </CartProvider>
        </NuqsAdapter>
      </body>
    </html>
  );
}
