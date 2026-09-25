import { Link } from "@/i18n/navigation";

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
        <h1 className="headline text-3xl text-fg-primary">
          {denied ? "Add an email to continue" : "Sign-in didn’t complete"}
        </h1>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-fg-secondary">
          {denied ? (
            <>
              <p>
                You signed in with an OrangeCat account that has no email yet. Solon needs one, so
                that the people you decide things with know it is you.
              </p>
              <p>
                Sign in again: OrangeCat now asks for the email on the way, keeps everything you
                already did on that account, and brings you straight back. Reading anything here
                never needs an account.
              </p>
            </>
          ) : (
            <p>
              Something went wrong talking to OrangeCat. Try again; if it keeps failing, the audit
              trail and all governance data remain fully readable without signing in.
            </p>
          )}
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/sign-in" className="btn-primary min-h-11">
            Sign in again
          </Link>
          <Link href="/" className="btn-secondary min-h-11">
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
