/** Bounded per-process burst protection. Authentication is checked by each route. */
const windows = new Map<string, { at: number; count: number }>();
export function allowAssistantRequest(
  actorId: string,
  bucket: "chat" | "dictation" | "law",
  now = Date.now(),
): boolean {
  for (const [key, value] of windows) if (now - value.at >= 600000) windows.delete(key);
  const key = `${bucket}:${actorId}`;
  const window = windows.get(key) ?? { at: now, count: 0 };
  if (
    window.count >= { chat: 20, dictation: 40, law: 12 }[bucket] ||
    (!windows.has(key) && windows.size >= 10000)
  )
    return false;
  windows.set(key, { at: window.at, count: window.count + 1 });
  return true;
}
