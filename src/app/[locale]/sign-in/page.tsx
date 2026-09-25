import { getTranslations, setRequestLocale } from "next-intl/server";
import { toLocale } from "@/i18n/routing";
import { redirect } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import { returnPath } from "@/lib/auth/sign-in-request";
import AccountEntry from "@/components/auth/account-entry";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ from?: string | string[] }>;
};

export async function generateMetadata({ params }: Props) {
  const t = await getTranslations({ locale: toLocale((await params).locale), namespace: "Entry" });
  return { title: `${t("signInTitle")} — Solon`, robots: { index: false } };
}

export const dynamic = "force-dynamic";

export default async function Page({ params, searchParams }: Props) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);
  const raw = (await searchParams).from;
  const from = typeof raw === "string" ? raw : undefined;
  // Already signed in: there is nothing to do here, so go where they meant to.
  if ((await auth())?.actorId) redirect({ href: returnPath(from), locale });
  return <AccountEntry mode="sign-in" from={from} locale={locale} />;
}
