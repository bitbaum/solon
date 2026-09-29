/**
 * A retrieval made by POST is stored as an envelope: the request with the
 * response text, as a web archive stores them. The response to a POST often
 * does not say what was asked (a tariff export does not name its year), so
 * the snapshot alone must be enough to import it again.
 */
import { z } from "zod";

export interface EnvelopedRequest {
  method: "POST";
  url: string;
  body: unknown;
}

const envelopeSchema = z.object({
  request: z.object({ method: z.literal("POST"), url: z.string(), body: z.unknown() }),
  /** The response exactly as served, as text. */
  response: z.string(),
});

export function envelopeBytes(request: EnvelopedRequest, responseText: string): Uint8Array {
  return new TextEncoder().encode(JSON.stringify({ request, response: responseText }));
}

/** An adapter's `decode` for enveloped JSON: the request, and the response parsed. */
export function decodeJsonEnvelope(bytes: Uint8Array): {
  request: EnvelopedRequest;
  response: unknown;
} {
  const envelope = envelopeSchema.parse(JSON.parse(new TextDecoder().decode(bytes)));
  return {
    request: {
      method: envelope.request.method,
      url: envelope.request.url,
      body: envelope.request.body,
    },
    response: JSON.parse(envelope.response) as unknown,
  };
}
