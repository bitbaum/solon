import { readFileSync } from "node:fs";
import { estimatePlace } from "@/lib/places/map-view";

const B = "https://swisstaxcalculator.estv.admin.ch/delegate/ost-integration/v1/lg-proxy/operation/c3b67379_ESTV";
const data = JSON.parse(readFileSync("/tmp/map.json", "utf8"));
const loc = new Map<number, number>(
  JSON.parse(readFileSync("/tmp/estv/communes-2025.json", "utf8")).response.map(
    (r: { Location: { BfsID: number; TaxLocationID: number } }) => [r.Location.BfsID, r.Location.TaxLocationID],
  ),
);
const COMMUNES = [2829, 2762, 1372, 1322, 1201, 1205, 1407, 1402, 5586, 261, 4001];
const INCOMES = [23_456, 30_000, 87_654, 250_999, 777_777];
let bad = 0, n = 0;
for (const bfs of COMMUNES) {
  const place = data.places.find((p: { feature: string }) => p.feature === String(bfs));
  for (const [variant, rel] of [["single", 1], ["married", 2]] as const) {
    for (const x of INCOMES) {
      const est = estimatePlace(data, place, { base: x, variant, conditions: {} });
      const g = (await fetch(`${B}/API_calculateSimpleTaxes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ SimKey: null, TaxYear: 2026, TaxLocationID: loc.get(bfs), Relationship: rel,
          Confession1: 4, Confession2: rel === 2 ? 4 : 0, Children: [], TaxableIncomeCanton: x, TaxableIncomeFed: x, TaxableFortune: 0 }),
      }).then((r) => r.json())).response;
      const c = (key: string) => est.kind === "estimate" ? est.estimate.components.find((k) => k.key === key)?.amount ?? NaN : NaN;
      const diffs = [c("federal") - g.IncomeTaxFed, c("cantonal") - g.IncomeTaxCanton, c("communal") - g.IncomeTaxCity];
      const off = diffs.some((d) => !(Math.abs(d) < 1));
      n++; if (off) bad++;
      if (off) process.stdout.write(`${place.name} ${variant} ${x}: federal/cantonal/communal diff ${diffs.map((d) => d.toFixed(1)).join(" / ")}\n`);
    }
  }
}
process.stdout.write(`${n} cases, off by CHF 1 or more in any part: ${bad}\n`);
