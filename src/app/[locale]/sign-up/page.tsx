import { mailConfigured } from "@/lib/auth";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { authLabelsFor, signInMethods } from "@bitbaum/accountkit/auth";
import { returnPath } from "@bitbaum/accountkit/orangecat";
import { SolonSignUp } from "@/components/auth/account-screens";
import PageLayout from "@/components/ui/page-layout";
import { getPathname } from "@/i18n/navigation";
import { toLocale } from "@/i18n/routing";
import { auth, authEnabled } from "@/lib/auth";
import { entryHref } from "@/lib/auth/entry-href";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ from?: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props) {
  const labels = authLabelsFor(toLocale((await params).locale));
  return { title: `${labels.createAccount} — Solon`, robots: { index: false } };
}

/**
 * A Solon account, with no other account behind it. An account says who you
 * are; a seat still comes only from founding or from a vote of the members.
 */
export default async function SignUpPage({ params, searchParams }: Props) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);
  const from = returnPath((await searchParams).from, "/account");
  const next = getPathname({ href: from, locale });
  if ((await auth())?.actorId) redirect(next);
  const labels = authLabelsFor(locale);

  return (
    <PageLayout title={labels.createAccount} kicker="Solon">
      <div className="max-w-md">
        {authEnabled ? (
          <SolonSignUp
            labels={labels}
            methods={signInMethods(process.env, mailConfigured())}
            next={next}
            signUpPath={getPathname({ href: "/sign-up", locale })}
            signInHref={entryHref("sign-in", locale, from)}
          />
        ) : (
          <p className="text-fg-secondary">{labels.errors.unavailable}</p>
        )}
      </div>
    </PageLayout>
  );
}
