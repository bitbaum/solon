import { DevelopmentPage } from "bip-kit/react";
import "bip-kit/styles.css";
import { getPathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { FLEET_PROFILE_URL, loadSolonProfile } from "@/lib/development-records";

/**
 * The roadmap or the changelog, inside Solon's shell. The data is the fleet
 * map's; the chrome (header, footer, width, tokens) is Solon's. bip-kit's
 * neutral theme is retuned to the shared tokens in globals.css (`--bp-*`).
 */
export default async function DevelopmentRecords({
  section,
  locale,
}: {
  section: "roadmap" | "changelog";
  locale: Locale;
}) {
  const profile = await loadSolonProfile();
  // bip-kit renders plain anchors, so the language prefix is applied here.
  const at = (href: string) => getPathname({ href, locale });
  return (
    <main className="section-shell py-section-tight">
      <DevelopmentPage
        profile={profile}
        section={section}
        homeHref={at("/")}
        roadmapHref={at("/roadmap")}
        changelogHref={at("/changelog")}
        profileHref={FLEET_PROFILE_URL}
      />
    </main>
  );
}
