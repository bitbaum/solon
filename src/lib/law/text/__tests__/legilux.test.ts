import { describe, expect, it } from "vitest";
import { countryOf } from "@/lib/config/law";
import { actTitle, parseLegiluxProvisions } from "../legilux";

// As Legilux prints a consolidated act (abridged from the 1915 law on commercial companies).
const HTML = `<div class="richtext_titre"><p><b>Titre I<sup>er</sup></b>-<b>Dispositions générales</b></p></div>
<div id="art_100-1" class="richtext_article" style=""><a name="art_100-1">​</a><p class=" richtext_num_article richtext_inline"><b style="font-weight: bold;">Art. 100-1.</b></p>
<div class="richtext_alinea"><p class="richtext_p">Les sociétés commerciales sont celles qui ont pour objet des actes de commerce.</p></div>
<div class="richtext_alinea"><p class="richtext_p">Elles se règlent par les conventions des parties.</p></div>
</div>
<div class="richtext_chapitre"><p><b>Chapitre II</b></p></div>
<div id="art_710-5" class="richtext_article"><p class=" richtext_num_article richtext_inline"><b>Art. 710-5.</b><span style="font-style: italic; display: none;">&nbsp;(L du 07 août 2023)</span><a class="btn">Modifications <span>1</span></a></p>
<div class="richtext_alinea"><p>(1)Le capital social doit être de 12 000&nbsp;euros au moins.</p></div></div>`;

describe("Luxembourg's consolidated acts, as Legilux prints them", () => {
  const out = parseLegiluxProvisions(HTML);

  it("cuts the act into its articles under Legilux's own anchors, headed by their number", () => {
    expect(out.map((p) => [p.path, p.heading])).toEqual([
      ["art_100-1", "Art. 100-1"],
      ["art_710-5", "Art. 710-5"],
    ]);
  });

  it("keeps each article's own words, and not the chapter after it or the buttons beside it", () => {
    expect(out[0]!.text).toBe(
      "Les sociétés commerciales sont celles qui ont pour objet des actes de commerce.\nElles se règlent par les conventions des parties.",
    );
    expect(out[1]!.text).toBe("(1)Le capital social doit être de 12 000 euros au moins.");
  });

  it("names an act by its own title, not the version's", () => {
    expect(
      actTitle(
        "Version consolidée applicable au 02/06/2026 : Loi du 10 août 1915 concernant les sociétés commerciales.",
      ),
    ).toBe("Loi du 10 août 1915 concernant les sociétés commerciales.");
    expect(actTitle("Code de commerce")).toBe("Code de commerce");
  });
});

describe("whose law an authority's law sits within", () => {
  it("reads the country from config", () => {
    expect(countryOf("zh")).toBe("CH");
    expect(countryOf("bfs261")).toBe("CH");
    expect(countryOf("intercantonal")).toBe("CH");
    expect(countryOf("li7001")).toBe("LI");
    expect(countryOf("lux")).toBe("LU");
    expect(countryOf("nope")).toBeNull();
  });
});
