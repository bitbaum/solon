import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { ogFonts, ogText } from "@fleet/design-tokens/og";
import { toLocale } from "@/i18n/routing";
import { SOLON_MARK } from "@/lib/brand/mark";
import { placesConfig } from "@/lib/config/places";
import { regionName, worldRegion } from "@/lib/config/world";
import { kindOf } from "@/lib/config/world/kinds";
import { db } from "@/lib/db/client";
import { placePhoto } from "@/lib/places/place-photo";
import { loadPlacePage } from "@/lib/places/place-page";

/**
 * The card a shared link to a place shows (named by the place page's metadata;
 * Next allows no `opengraph-image` file under a catch-all route): its photograph across the card,
 * its name, what kind of place it is, and Solon's mark. The same for a
 * country, a state, a canton or a proclaimed state; a place with no
 * photograph gets the site's dark card with its name.
 */
const size = { width: 1200, height: 630 };

// Satori cannot read CSS custom properties: these mirror @fleet/design-tokens, as the site's card does.
const INK = "#0A0A0A";
const ORANGE = "#FF5C00";
const MUTED = "#D4D4D4";
const FACES = "inter:400,600";

/** The card's photograph at a width Wikimedia keeps (1280), not the page's 1920. */
const cardSize = (src: string) => src.replace(/\/\d+px-/, "/1280px-");

/** `?locale=de&path=switzerland/zh` — the place page's own path below /places. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const locale = toLocale(params.get("locale") ?? "en");
  const t = await getTranslations({ locale, namespace: "Places" });
  const path = (params.get("path") ?? "").split("/").filter(Boolean).slice(0, 8);
  const last = path.at(-1) ?? "";
  const region = worldRegion(last);
  const view =
    !region || path.length > 1
      ? await loadPlacePage(
          db,
          placesConfig,
          path.join("/"),
          new Date().toISOString().slice(0, 10),
          locale,
        ).catch(() => null)
      : null;
  const name = view?.name ?? (region ? regionName(region, locale) : last);
  const kicker = region
    ? t(`profile.kicker.${kindOf(region)}`)
    : (view?.levelName ?? t("world.kicker"));
  const photo = placePhoto([...(region ? [`world:${region.slug}`] : []), ...(view?.refs ?? [])]);
  const line = (text: string) => ogText(text, FACES);
  const title = name.length > 22 ? 72 : 96;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        background: INK,
        fontFamily: "Inter",
      }}
    >
      {photo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cardSize(photo.src)}
          width={1200}
          height={630}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 1200,
            height: 630,
            objectFit: "cover",
            objectPosition: photo.position ?? "center 40%",
          }}
          alt=""
        />
      )}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 1200,
          height: 630,
          display: "flex",
          backgroundImage:
            "linear-gradient(180deg, rgba(10,10,10,0.35) 0%, rgba(10,10,10,0.2) 35%, rgba(10,10,10,0.9) 100%)",
        }}
      />
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          padding: "64px 72px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <svg width={48} height={48} viewBox={SOLON_MARK.viewBox.join(" ")}>
            <path fill={ORANGE} fillRule={SOLON_MARK.fillRule} d={SOLON_MARK.d} />
          </svg>
          <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: "0.24em", color: "#FFFFFF" }}>
            SOLON
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 24,
              fontWeight: 600,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: MUTED,
              textShadow: "0 1px 12px rgba(0,0,0,0.6)",
            }}
          >
            {line(kicker)}
          </div>
          <div
            style={{
              marginTop: 12,
              fontSize: title,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              lineHeight: 1.02,
              color: "#FFFFFF",
              textShadow: "0 2px 24px rgba(0,0,0,0.5)",
            }}
          >
            {line(name)}
          </div>
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: await ogFonts(FACES),
      // A place's card changes when its photograph or name does: kept a day, served stale a week.
      headers: { "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" },
    },
  );
}
