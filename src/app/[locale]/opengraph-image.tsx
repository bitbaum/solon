import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { ogFonts, ogText } from "@fleet/design-tokens/og";

import { toLocale } from "@/i18n/routing";
import { SOLON_MARK } from "@/lib/brand/mark";

/**
 * Social preview card, generated at request time by Next's file convention,
 * one per language. It says what the home page says (its hero, `Home.hero`):
 * the card used to carry its own tagline, which went stale while the site
 * grew law and data. 1200×630 is the 1.91:1 card size Telegram, Slack and
 * the rest crop to.
 */

// No `runtime` export: Next 16 deprecates the Edge Runtime, and Node is the
// default. `next/og` renders identically on it.
export const alt = "Solon";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Satori cannot read CSS custom properties, so these mirror @fleet/design-tokens
// by hand — the one place in the repo where a literal is unavoidable. Keep in
// sync with tokens.css; design:check cannot see bare consts like these.
const INK = "#0A0A0A"; // --surface-public: 0 0% 4%
const ORANGE = "#FF5C00"; // --public-accent
const MUTED = "#A6A6A6"; // --text-secondary: 0 0% 65%

// The faces ship with the design-tokens package, so rendering fetches nothing;
// Inter covers every language Solon speaks, Cyrillic included.
const FACES = "inter:400,600";

export default async function OGImage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale: toLocale(locale), namespace: "Home.hero" });
  const line = (text: string) => ogText(text, FACES);
  // Every language's headline on two lines: a long first line ("Gemeinsam entscheiden.") gets smaller type.
  const longest = Math.max(t("line1").length, t("line2").length);
  const headline = longest > 18 ? 72 : 88;
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: INK,
        padding: "72px 80px",
        fontFamily: "Inter",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        {/* The mark, from the same generated data as the header and the icons. */}
        <svg width={56} height={56} viewBox={SOLON_MARK.viewBox.join(" ")}>
          <path fill={ORANGE} fillRule={SOLON_MARK.fillRule} d={SOLON_MARK.d} />
        </svg>
        <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: "0.24em", color: "#FFFFFF" }}>
          SOLON
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: headline,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            lineHeight: 1,
            textTransform: "uppercase",
            color: "#FFFFFF",
          }}
        >
          <span>{line(t("line1"))}</span>
          <span style={{ color: MUTED }}>{line(t("line2"))}</span>
        </div>
        <div
          style={{ marginTop: 28, fontSize: 28, lineHeight: 1.35, color: MUTED, maxWidth: 1040 }}
        >
          {line(t("lede"))}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{ width: 64, height: 5, borderRadius: 999, background: ORANGE, display: "flex" }}
        />
        <div style={{ fontSize: 24, color: MUTED }}>solon.orangecat.ch</div>
      </div>
    </div>,
    { ...size, fonts: await ogFonts(FACES) },
  );
}
