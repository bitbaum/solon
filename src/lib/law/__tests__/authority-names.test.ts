import { describe, expect, it } from "vitest";
import { LAW_AUTHORITIES } from "@/lib/config/law";
import { nameAuthorities } from "../authority-names";

const zurich = (levelKey: string) => ({
  countryPack: "switzerland",
  levelKey,
  names: [{ locale: "de", script: null, name: "Zürich", nameType: "self" as const }],
});

describe("an authority's name comes from its place", () => {
  it("names a place by Places, a country by Intl, and the rest from messages", () => {
    const names = nameAuthorities(
      LAW_AUTHORITIES,
      (a) =>
        a.key === "zh" ? zurich("canton") : a.key === "zurich-city" ? zurich("commune") : undefined,
      "fr",
      (key) => (key === "eu" ? "Union européenne" : undefined),
    );
    expect(names.get("li")).toBe("Liechtenstein");
    expect(names.get("de")).toBe("Allemagne");
    expect(names.get("eu")).toBe("Union européenne");
    // No place in Places yet and no message: the English label, never an empty name.
    expect(names.get("intercantonal")).toBe("Intercantonal");
  });

  it("tells two places of one name apart by their level", () => {
    const city = LAW_AUTHORITIES.find((a) => a.label === "Zürich (city)")!;
    const names = nameAuthorities(
      LAW_AUTHORITIES,
      (a) =>
        a.key === "zh" ? zurich("canton") : a.key === city.key ? zurich("municipality") : undefined,
      "en",
      () => undefined,
    );
    expect(names.get("zh")).not.toBe(names.get(city.key));
    expect(names.get("zh")).toMatch(/^Zürich \(/);
  });
});
