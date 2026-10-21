import { expect, it } from "vitest";
import { allowAssistantRequest } from "../rate-limit";

it("limits bursts per person and operation, then permits another window", () => {
  const id = crypto.randomUUID();
  const now = Date.now();
  for (let i = 0; i < 20; i++) expect(allowAssistantRequest(id, "chat", now)).toBe(true);
  expect(allowAssistantRequest(id, "chat", now)).toBe(false);
  expect(allowAssistantRequest(id, "dictation", now)).toBe(true);
  expect(allowAssistantRequest(crypto.randomUUID(), "chat", now)).toBe(true);
  expect(allowAssistantRequest(id, "chat", now + 600000)).toBe(true);
});
