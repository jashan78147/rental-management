import Link from "next/link";
import { SignOut, UserCircle } from "@phosphor-icons/react/dist/ssr";
import { currentAccount } from "@/lib/auth/users";
import { logoutAction } from "@/lib/auth/actions";

/** Who is signed in, and the way out. Server rendered from the session cookie. */
export async function AccountMenu() {
  const account = await currentAccount();

  if (!account) {
    return (
      <Link
        href="/login"
        className="flex h-9 items-center gap-2 rounded-full border border-line px-3 text-sm font-medium text-ink-soft transition-[color,border-color,transform] duration-150 ease-[var(--ease-out)] hover:border-clay hover:text-clay active:scale-95"
      >
        <UserCircle size={17} weight="bold" aria-hidden="true" />
        <span className="hidden sm:inline">Sign in</span>
      </Link>
    );
  }

  const initials = account.fullName
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex items-center gap-2">
      <Link
        href={account.role === "end_user" ? "/console" : "/portal"}
        className="flex h-9 items-center gap-2 rounded-full border border-line pl-1.5 pr-3 text-sm font-medium text-ink transition-[border-color,transform] duration-150 ease-[var(--ease-out)] hover:border-clay active:scale-95"
        title={`${account.fullName} (${account.role === "end_user" ? "operator" : "customer"})`}
      >
        <span
          aria-hidden="true"
          className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-clay text-[0.65rem] font-semibold text-on-clay"
        >
          {initials}
        </span>
        <span className="hidden max-w-28 truncate sm:inline">
          {account.fullName.split(" ")[0]}
        </span>
      </Link>

      <form action={logoutAction}>
        <button
          type="submit"
          aria-label="Sign out"
          className="grid h-9 w-9 place-items-center rounded-full border border-line text-ink-soft transition-[color,border-color,transform] duration-150 ease-[var(--ease-out)] hover:border-rust hover:text-rust active:scale-95"
        >
          <SignOut size={16} weight="bold" aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
