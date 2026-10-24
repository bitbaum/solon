/** Reads a JSON body without trusting content-length: stops at `max` bytes. */
export async function readJsonBounded(
  req: Request,
  max = 100_000,
): Promise<{ ok: true; body: unknown } | { ok: false; status: 400 | 413 }> {
  const reader = req.body?.getReader();
  if (!reader) return { ok: false, status: 400 };
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > max) {
      await reader.cancel();
      return { ok: false, status: 413 };
    }
    chunks.push(value);
  }
  const buffer = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return { ok: true, body: JSON.parse(new TextDecoder().decode(buffer)) };
  } catch {
    return { ok: true, body: null };
  }
}
