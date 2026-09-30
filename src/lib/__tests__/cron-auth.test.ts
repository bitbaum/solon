import { describe, expect, it } from "vitest";
import { isCronRequest } from "../cron-auth";

describe("isCronRequest", () => {
  it("lets in only the configured bearer secret", () => {
    expect(isCronRequest("Bearer s3cret-value", "s3cret-value")).toBe(true);
    expect(isCronRequest("Bearer wrong", "s3cret-value")).toBe(false);
    expect(isCronRequest("s3cret-value", "s3cret-value")).toBe(false);
    expect(isCronRequest(null, "s3cret-value")).toBe(false);
  });

  it("lets nobody in when no secret is configured", () => {
    expect(isCronRequest("Bearer ", "")).toBe(false);
    expect(isCronRequest("Bearer anything", undefined)).toBe(false);
  });
});
