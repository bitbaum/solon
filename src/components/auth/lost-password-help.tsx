import { getTranslations } from "next-intl/server";
import type { LostPasswordWay } from "@/lib/auth/recovery";
import { CONTACT_EMAIL } from "@/lib/site-config";

/**
 * The way forward for a lost password while this deployment sends no email.
 * Rendered only when there is no "Forgot your password?" to offer; it names
 * the ways in that are really here, and nothing else.
 */
export default async function LostPasswordHelp({ ways }: { ways: LostPasswordWay[] }) {
  if (ways.length === 0) return null;
  const t = await getTranslations("LostPassword");

  return (
    <section
      aria-labelledby="lost-password"
      data-testid="lost-password"
      className="mt-10 flex flex-col gap-3 border-t border-default pt-6 text-sm leading-relaxed text-fg-secondary"
    >
      <h2 id="lost-password" className="text-sm font-semibold text-fg-primary">
        {t("title")}
      </h2>
      <p className="mb-0">{t("lede")}</p>
      <ul className="flex flex-col gap-2">
        {ways.map((way) => (
          <li key={way}>
            {way === "contact"
              ? t.rich("contact", {
                  email: CONTACT_EMAIL,
                  mail: (chunks) => (
                    <a
                      href={`mailto:${CONTACT_EMAIL}`}
                      className="break-all text-fg-primary underline underline-offset-4"
                    >
                      {chunks}
                    </a>
                  ),
                })
              : t(way)}
          </li>
        ))}
      </ul>
    </section>
  );
}
