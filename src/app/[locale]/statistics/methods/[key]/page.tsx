import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { toLocale } from "@/i18n/routing";
import ExplainPanel from "@/components/statistics/explain-panel";
import { MethodView } from "@/components/statistics/methods-view";
import { METHODOLOGIES } from "@/lib/config/statistics/methodologies";
import { buildMethodBrief } from "@/lib/statistics/method-brief";
import { questionsFor } from "@/lib/statistics/methodologies";

type Params = Promise<{ locale: string; key: string }>;

export function generateStaticParams() {
  return METHODOLOGIES.map((m) => ({ key: m.key }));
}

export async function generateMetadata({ params }: { params: Params }) {
  const { locale: raw, key } = await params;
  const m = METHODOLOGIES.find((x) => x.key === key);
  if (!m) return {};
  const t = await getTranslations({ locale: toLocale(raw), namespace: "Statistics" });
  return {
    title: `${m.name} · ${t("methods.metaTitle")}`,
    description: t("methods.metaDescription"),
  };
}

/** One index, described so a reader can judge it, and asked about with AI from what was read. */
export default async function MethodPage({ params }: { params: Params }) {
  const { locale: raw, key } = await params;
  const locale = toLocale(raw);
  setRequestLocale(locale);
  const m = METHODOLOGIES.find((x) => x.key === key);
  if (!m) notFound();
  const t = await getTranslations({ locale, namespace: "Statistics" });
  return (
    <MethodView
      m={m}
      locale={locale}
      t={t}
      questions={questionsFor(m).map((q) => t(`methods.questions.${q}`))}
      explain={
        <ExplainPanel
          facts={buildMethodBrief(m)}
          locale={locale}
          t={t}
          subject={{ kind: "method", method: m.key }}
        />
      }
    />
  );
}
