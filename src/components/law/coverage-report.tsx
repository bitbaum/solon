import type { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import PageLayout from "@/components/ui/page-layout";
import type { LawCoverage } from "@/lib/law/register/coverage";

export type LawTranslator = ReturnType<typeof useTranslations<"Law">>;

interface LawCoverageReportProps {
  coverage: LawCoverage;
  t: LawTranslator;
}

const cardClass = "rounded-surface border border-default bg-surface-base p-6";

/**
 * The law register as the data has it (design L0). Nothing here is typed in:
 * an authority with no acts shows as zero, not as silence.
 */
export default function LawCoverageReport({ coverage, t }: LawCoverageReportProps) {
  const { authorities, totals, retrievedOn } = coverage;
  return (
    <PageLayout title={t("coverage.title")} kicker={t("coverage.kicker")}>
      <div className="max-w-3xl space-y-8">
        <p className="text-sm text-fg-secondary">
          {retrievedOn ? t("coverage.intro", { date: retrievedOn }) : t("coverage.neverRetrieved")}
        </p>

        <div className={cardClass}>
          <p className="text-3xl font-semibold tabular-nums text-fg-primary">
            {totals.inForce.toLocaleString("en-CH")}
          </p>
          <p className="text-sm text-fg-secondary">
            {t("coverage.totals", {
              notInForce: totals.notInForce.toLocaleString("en-CH"),
              withText: totals.withText.toLocaleString("en-CH"),
            })}
          </p>
        </div>

        <div className={cardClass}>
          <h2 className="mb-3 font-semibold text-fg-primary">{t("coverage.authorities")}</h2>
          <ul className="space-y-2 text-sm">
            {authorities.map((authority) => (
              <li
                key={authority.key}
                className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-6"
              >
                <span className="text-fg-primary">{authority.name}</span>
                <span className="text-fg-secondary tabular-nums sm:text-right">
                  {t("coverage.row", {
                    inForce: authority.inForce.toLocaleString("en-CH"),
                    notInForce: authority.notInForce.toLocaleString("en-CH"),
                  })}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-fg-tertiary">{t("coverage.note")}</p>
        <p className="text-sm">
          <Link href="/law" className="text-fg-secondary underline">
            {t("coverage.readLink")}
          </Link>
        </p>
      </div>
    </PageLayout>
  );
}
