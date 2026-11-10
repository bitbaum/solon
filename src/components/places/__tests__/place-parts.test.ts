import { describe, expect, it, vi } from "vitest";
import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider, createTranslator } from "next-intl";
import en from "../../../../messages/en.json";
import type { PlaceView } from "@/lib/places/place-view";
import PlaceParts from "../place-parts";

// next/image needs the Next runtime; a plain img shows what it would load.
vi.mock("next/image", () => ({
  default: ({ src }: { src: string }) => createElement("img", { src }),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, className }: { href: string; children: unknown; className?: string }) =>
    createElement("a", { href, className }, children as never),
}));

const t = createTranslator({ locale: "en", messages: en, namespace: "Places" });
const render = (view: PlaceView) =>
  renderToStaticMarkup(
    createElement(
      NextIntlClientProvider,
      { locale: "en", messages: en } as ComponentProps<typeof NextIntlClientProvider>,
      createElement(PlaceParts, { view, t }),
    ),
  );

const viewWith = (places: PlaceView["parts"][number]["places"]) =>
  ({ name: "Switzerland", parts: [{ levelName: "Canton", places }] }) as unknown as PlaceView;

describe("the places inside a place", () => {
  it("shows cantons as photographs, found by their FSO number through the crosswalk", () => {
    const html = render(
      viewWith([
        { name: "Zürich", levelName: "Canton", slugPath: "switzerland/zh", refs: ["bfs_canton:1"] },
        { name: "Jura", levelName: "Canton", slugPath: "switzerland/ju", refs: ["bfs_canton:26"] },
      ]),
    );
    expect(html.match(/<img src="\/api\/place-photo\/960\//g)).toHaveLength(2);
    expect(html).toContain("Saint-Ursanne");
  });

  it("keeps a plain list where most places have no photograph", () => {
    const html = render(
      viewWith([
        { name: "Nowhere", levelName: "Canton", slugPath: "x/a", refs: [] },
        { name: "Elsewhere", levelName: "Canton", slugPath: "x/b", refs: [] },
        { name: "Zürich", levelName: "Canton", slugPath: "x/zh", refs: ["bfs_canton:1"] },
      ]),
    );
    expect(html).not.toContain("<img");
    expect(html).toContain("Elsewhere");
  });
});
