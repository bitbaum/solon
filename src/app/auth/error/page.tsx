import Link from "next/link";

export const metadata = { title: "Sign-in problem — Solon" };

/**
 * NextAuth redirects here with ?error=<code>. The case worth a real
 * explanation is AccessDenied: our signIn callback rejects OrangeCat
 * accounts without an email (OC's anonymous "start instantly" accounts),
 * because a governance identity must be attributable.
 */
export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const denied = error === "AccessDenied";
  return (
    <main className="section-shell flex items-center justify-center py-20 sm:py-28">
      <div className="w-full max-w-lg rounded-surface border border-default bg-surface-base p-8">
        <h1 className="font-display text-3xl text-fg-primary">
          {denied ? "This OrangeCat account can’t be recognized" : "Sign-in didn’t complete"}
        </h1>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-fg-secondary">
      {denied ? (
        <>
          <p>
            Your OrangeCat account has no email address — it is an anonymous
            account. Solon is a governance system: every recognized identity
            must be attributable, so anonymous accounts can’t sign in here.
          </p>
          <p>
            Add an email to your account at{" "}
            <a
              href="https://orangecat.ch/settings"
              className="text-accent underline underline-offset-2 hover:text-accent-hover"
            >
              orangecat.ch/settings
            </a>{" "}
            and try again. Note that you never need to sign in to observe —
            all governance data on this site is public — or to vote, which
            works by Bitcoin signature alone.
          </p>
        </>
      ) : (
        <p>
          Something went wrong talking to OrangeCat. Try again from the
          navigation bar; if it keeps failing, the audit trail and all
          governance data remain fully readable without signing in.
        </p>
      )}
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-control border border-default bg-surface-raised px-4 py-2.5 text-sm font-medium text-fg-primary transition-colors hover:bg-surface-overlay"
          >
            Back to Solon
          </Link>
          <Link
            href="/governance/audit"
            className="inline-flex items-center justify-center rounded-control px-4 py-2.5 text-sm font-medium text-fg-secondary transition-colors hover:text-fg-primary"
          >
            Browse the audit trail →
          </Link>
        </div>
      </div>
    </main>
  );
}
