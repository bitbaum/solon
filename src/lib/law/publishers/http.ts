/** Polite reading shared by every publisher adapter: who we are, a deadline, only the publisher's own hosts. */
export const USER_AGENT = "solon-law-text (cato@orangecat.ch)";

export async function getText(
  url: string,
  doFetch: typeof fetch,
  hosts: readonly string[],
): Promise<string> {
  const bytes = await getBytes(url, doFetch, hosts);
  return new TextDecoder().decode(bytes);
}

export async function getBytes(
  url: string,
  doFetch: typeof fetch,
  hosts: readonly string[],
): Promise<Uint8Array> {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || !hosts.includes(parsed.hostname)) {
    throw new Error(`not a publisher address: ${url}`);
  }
  const response = await doFetch(url, {
    headers: { "user-agent": USER_AGENT },
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) throw new Error(`${response.status} for ${url}`);
  return new Uint8Array(await response.arrayBuffer());
}
