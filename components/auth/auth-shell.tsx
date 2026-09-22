import Link from "next/link";
import { ShieldCheck, UsersThree } from "@phosphor-icons/react/dist/ssr";
import { BrandMark } from "@/components/brand-mark";

/**
 * Split screen: the brand holds the left half, the form sits on the right.
 *
 * On a phone the panel collapses to a header strip, because someone who opened
 * the sign-in page came to sign in, and the form should not sit a full screen
 * below a wall of marketing. The pitch is for the desktop layout, where it
 * costs the form nothing.
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-[1fr_1fr] xl:grid-cols-[1.05fr_0.95fr]">
      {/* Brand panel */}
      <div className="panel-dark relative flex flex-col overflow-hidden px-6 py-6 sm:px-10 lg:justify-between lg:px-14 lg:py-12">
        {/* A faint engineering grid, drawn rather than imported. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.35) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.35) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(120% 90% at 20% 15%, #000 35%, transparent 80%)",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 top-1/3 hidden h-80 w-80 rounded-full bg-gold/10 blur-3xl lg:block"
        />

        <Link href="/" className="relative w-fit">
          <BrandMark size="lg" tone="onDark" />
        </Link>

        {/* The phone gets one line instead of the pitch. */}
        <p className="relative mt-3 text-sm text-white/65 lg:hidden">
          Camera, lighting, audio and staging, hired by the day, week or month.
        </p>

        <div className="animate-rise relative my-10 hidden max-w-lg lg:my-0 lg:block">
          {/* A strapline, not the page heading: the form owns that. */}
          <p className="font-display text-4xl font-semibold leading-[1.1] tracking-[-0.022em] text-white lg:text-5xl">
            Camera, lighting, audio and staging, on hire.
          </p>
          <p className="mt-5 text-white/70">
            One account covers both sides of the counter: book your own dates and track every hire
            as a customer, or run the desk as an operator.
          </p>

          <ul className="mt-8 space-y-3">
            <li className="flex items-center gap-3 text-sm text-white/80">
              <ShieldCheck size={18} weight="duotone" className="text-gold" aria-hidden="true" />
              Passwords hashed with scrypt, sessions signed and httpOnly
            </li>
            <li className="flex items-center gap-3 text-sm text-white/80">
              <UsersThree size={18} weight="duotone" className="text-gold" aria-hidden="true" />
              Role-based access: customers see their hires, operators see the desk
            </li>
          </ul>
        </div>

        <p className="relative hidden text-xs text-white/45 lg:block">
          A practice build. Catalog and customers are fictional, payments run in test mode.
        </p>
      </div>

      {/* Form side */}
      <div className="flex items-center justify-center bg-paper px-4 py-8 sm:px-8 lg:py-12">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
