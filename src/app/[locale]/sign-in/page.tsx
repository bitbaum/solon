import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { authLabelsFor, signInMethods } from "@bitbaum/accountkit/auth";
import { returnPath } from "@bitbaum/accountkit/orangecat";
import { SolonSignIn } from "@/components/auth/account-screens";
import PageLayout from "@/components/ui/page-layout";
import { getPathname } from "@/i18n/navigation";
import { toLocale } from "@/i18n/routing";
import { auth, authEnabled } from "@/lib/auth";
import { entryHref } from "@/lib/auth/entry-href";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ from?: string; error?: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props) {
  const labels = authLabelsFor(toLocale((await params).locale));
  return { title: `${labels.signIn} — Solon`, robots: { index: false } };
}

/**
 * Every way in, on one screen: email and password, a passkey, or OrangeCat.
 * No OrangeCat account is needed. They come back to `from`, in their language.
 */
export default async function SignInPage({ params, searchParams }: Props) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);
  const query = await searchParams;
  const from = returnPath(query.from, "/account");
  const next = getPathname({ href: from, locale });
  if ((await auth())?.actorId) redirect(next);
  const labels = authLabelsFor(locale);

  return (
    <PageLayout title={labels.signIn} kicker="Solon">
      <div className="max-w-md">
        {authEnabled ? (
          <SolonSignIn
            labels={labels}
            methods={signInMethods(process.env, false)}
            next={next}
            signInPath={getPathname({ href: "/sign-in", locale })}
            signUpHref={entryHref("sign-up", locale, from)}
            initialError={Boolean(query.error)}
          />
        ) : (
          <p className="text-fg-secondary">{labels.errors.unavailable}</p>
        )}
      </div>
    </PageLayout>
  );
}
