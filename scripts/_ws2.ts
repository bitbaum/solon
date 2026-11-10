import { readPlan } from "@/lib/law/plan/load";
import { wikisourceRestUrl, wikisourceText } from "@/lib/law/text/plan-copy";
const UA = "SolonLawReader/1.0 (https://solon.orangecat.ch; law register)";
const plan = readPlan();
(async () => {
  for (const iso of process.argv.slice(2)) {
    const c = plan.countries[iso]!.constitution.chosen!;
    let r: Response | null = null;
    for (let a = 0; a < 6; a++) {
      r = await fetch(wikisourceRestUrl(c.url), { headers: { "user-agent": UA } });
      if (r.status !== 429) break;
      await new Promise((x) => setTimeout(x, 20000));
    }
    const html = await r!.text();
    console.log(`== ${iso}`, c.url);
    console.log(
      wikisourceText(html).split("\n").filter(Boolean).slice(0, 25).join(" | ").slice(0, 900),
    );
    console.log(
      "links:",
      [...html.matchAll(/<a [^>]*href="\.\/([^"#]+)"[^>]*>([^<]*)</g)]
        .map((m) => decodeURIComponent(m[1]!) + " «" + m[2] + "»")
        .slice(0, 15)
        .join("\n  "),
    );
    await new Promise((x) => setTimeout(x, 8000));
  }
})();
