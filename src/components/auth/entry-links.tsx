import { Link } from "@/i18n/navigation";

/**
 * The way in from a page where someone was about to take part — found an
 * organization, file a proposal, join — and turned out to be signed out.
 *
 * These pages used to post straight to OrangeCat's sign-in with a button
 * reading "Sign in with OrangeCat", which told a person without an OrangeCat
 * account that they needed one. They do not: /sign-up takes an email, Google
 * or GitHub (docs/design/2026-09-uniform-auth.md). So the choice is offered
 * here as it is everywhere else, and both routes carry `from`, so the person
 * lands back on this exact page — the proposal's title and context included.
 */
export default function EntryLinks({ from }: { from: string }) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <Link href={{ pathname: "/sign-up", query: { from } }} className="btn-primary">
        Create an account
      </Link>
      <Link
        href={{ pathname: "/sign-in", query: { from } }}
        className="text-sm text-fg-secondary transition-colors hover:text-fg-primary"
      >
        I already have an account
      </Link>
    </div>
  );
}

/** The one sentence every signed-out participation page says about what it takes. */
export const ENTRY_COST =
  "An email, Google or GitHub is enough. No wallet, and no OrangeCat account needed first.";
