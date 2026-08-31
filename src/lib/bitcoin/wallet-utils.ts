export function satsToBTC(sats: number) {
  return sats / 100_000_000;
}

export function shorten(str: string, n = 6) {
  if (!str) return "";
  return `${str.slice(0, n)}…${str.slice(-n)}`;
}
