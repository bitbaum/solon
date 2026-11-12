/**
 * Asking Wikidata, politely: one place for the user agent, the waits and the
 * query service's answer shape, for every script that reads it. A 429 or 503
 * waits as long as the server asks (at most two minutes), eight times.
 */
const USER_AGENT = "SolonWikidataReader/1.0 (https://solon.orangecat.ch; places and law)";
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function politeJson(url: string, accept = "application/json"): Promise<unknown> {
  for (let attempt = 1; ; attempt++) {
    const r = await fetch(url, {
      headers: { "user-agent": USER_AGENT, accept },
      signal: AbortSignal.timeout(180_000),
    });
    if (r.ok) return r.json();
    if ((r.status !== 429 && r.status !== 503) || attempt >= 8)
      throw new Error(`${url.slice(0, 120)}: HTTP ${r.status}`);
    const asked = Number(r.headers.get("retry-after"));
    await sleep(
      Math.min(120_000, Number.isFinite(asked) && asked > 0 ? asked * 1000 + 500 : 5000 * attempt),
    );
  }
}

/** A SPARQL query's rows, each variable's value as a string. */
export async function sparql(query: string): Promise<Record<string, string>[]> {
  const body = (await politeJson(
    `https://query.wikidata.org/sparql?query=${encodeURIComponent(query)}`,
    "application/sparql-results+json",
  )) as { results: { bindings: Record<string, { value: string }>[] } };
  return body.results.bindings.map((b) =>
    Object.fromEntries(Object.entries(b).map(([k, v]) => [k, v.value])),
  );
}

/** The item number at the end of an entity address. */
export const itemOf = (uri: string) => uri.replace(/^.*\//, "");
