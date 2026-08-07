import { ImageResponse } from "next/og";

/**
 * Social preview card, generated at request time by Next's file convention.
 *
 * Solon had no og:image at all, so every link to it — Telegram, Slack, a DM —
 * rendered as a blank grey rectangle. 1200×630 is the canonical 1.91:1 card
 * size all three of those scrapers crop to.
 *
 * Satori cannot read CSS custom properties, so the palette is repeated here as
 * literals. globals.css remains the source of truth; these mirror it and are
 * the only non-CSS consumer of the tokens.
 */

export const runtime = "edge";
export const alt = "Solon — Bitcoin-Native Governance";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Mirrors --solon-dark / --solon-orange / --solon-bitcoin in src/app/globals.css
const INK = "#0F172A";
const ORANGE = "#F97316";
const BITCOIN = "#F7931A";
const MUTED = "#94A3B8";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: INK,
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: 999,
              background: BITCOIN,
              display: "flex",
            }}
          />
          <div
            style={{
              fontSize: 26,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: MUTED,
            }}
          >
            Solon
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 92,
              fontWeight: 700,
              letterSpacing: "-0.03em",
              lineHeight: 1.02,
              color: "#FFFFFF",
              maxWidth: 960,
            }}
          >
            Bitcoin-Native Governance
          </div>
          <div
            style={{
              marginTop: 28,
              fontSize: 34,
              lineHeight: 1.3,
              color: MUTED,
              maxWidth: 880,
            }}
          >
            Radical transparency and cryptographic democracy for organizations.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 64, height: 5, borderRadius: 999, background: ORANGE, display: "flex" }} />
          <div style={{ fontSize: 24, color: MUTED }}>solon.orangecat.ch</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
