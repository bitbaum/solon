import Link from "next/link";

export const metadata = { title: "Sign-in problem — Solon" };

/**
 * NextAuth redirects here with ?error=<code>. The case worth a real
 * explanation is AccessDenied: our signIn callback rejects OrangeCat
 * accounts without an email (OC's anonymous "start instantly" accounts),
 * because a governance identity must be attributable.
 */
export default function AuthErrorPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const denied = searchParams.error === "AccessDenied";
  return (
    <main className="max-w-xl mx-auto py-24 text-center">
      <h1 className="text-2xl font-bold text-navy mb-4">
        {denied ? "This OrangeCat account can’t be recognized" : "Sign-in didn’t complete"}
      </h1>
      {denied ? (
        <div className="text-fg-secondary space-y-4 text-left">
          <p>
            Your OrangeCat account has no email address — it is an anonymous
            account. Solon is a governance system: every recognized identity
            must be attributable, so anonymous accounts can’t sign in here.
          </p>
          <p>
            Add an email to your account at{" "}
            <a href="https://orangecat.ch/settings" className="text-navy underline">
              orangecat.ch/settings
            </a>{" "}
            and try again. Note that you never need to sign in to observe —
            all governance data on this site is public — or to vote, which
            works by Bitcoin signature alone.
          </p>
        </div>
      ) : (
        <p className="text-fg-secondary">
          Something went wrong talking to OrangeCat. Try again from the
          navigation bar; if it keeps failing, the audit trail and all
          governance data remain fully readable without signing in.
        </p>
      )}
      <div className="mt-8">
        <Link
          href="/"
          className="px-4 py-2 text-sm font-medium bg-navy text-white rounded-md hover:bg-navy-light transition-colors"
        >
          Back to Solon
        </Link>
      </div>
    </main>
  );
}
