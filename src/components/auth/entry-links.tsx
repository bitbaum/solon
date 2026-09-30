import { getLocale } from "next-intl/server";
import { entryHref } from "@/lib/auth/entry-href";

/**
 * The way in from a page where someone was about to take part — found an
 * organization, file a proposal, join — and turned out to be signed out.
 * Both links open OrangeCat's sign-in screen (titled for Solon), on "Create an
 * account" or "Sign in", and carry `from`, so the person lands back on this
 * exact page — the proposal's title and context included.
 */
export default async function EntryLinks({ from }: { from: string }) {
  const locale = await getLocale();
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
      <a href={entryHref("sign-up", locale, from)} className="btn-primary">
        Create an account
      </a>
      <a
        href={entryHref("sign-in", locale, from)}
        className="text-sm font-semibold text-fg-secondary underline-offset-4 transition-colors hover:text-fg-primary hover:underline"
      >
        I already have an account
      </a>
    </div>
  );
}

/** The one sentence every signed-out participation page says about what it takes. */
export const ENTRY_COST =
  "An email and password, an emailed code, Google or GitHub: whichever you like. No wallet needed.";
