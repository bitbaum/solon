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
    const t = wikisourceText(html).split("\n").filter(Boolean);
    const subs = [...html.matchAll(/href="\.\/([^"#]+)"/g)]
      .map((m) => decodeURIComponent(m[1]!))
      .filter((h) => h.includes("/"));
    console.log(
      `== ${iso} ${r!.status} lines=${t.length} subpages=${subs.length}`,
      subs.slice(0, 4),
    );
    console.log(
      t
        .filter((l) => /\d/.test(l) && l.length < 40)
        .slice(0, 12)
        .join(" | "),
    );
    await new Promise((x) => setTimeout(x, 8000));
  }
})();
