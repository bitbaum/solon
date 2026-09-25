import { describe, expect, it } from "vitest";
import { authorizationParams, returnPath } from "../sign-in-request";

describe("authorizationParams", () => {
  it("asks OrangeCat to open on sign-up, with the email pre-filled", () => {
    expect(authorizationParams({ mode: "sign-up", email: " ada@example.org " })).toEqual({
      prompt: "create",
      login_hint: "ada@example.org",
    });
  });

  it("asks for nothing extra on a plain sign-in", () => {
    expect(authorizationParams({ mode: "sign-in" })).toEqual({});
  });

  it("sends a chosen provider straight through", () => {
    expect(authorizationParams({ mode: "sign-in", provider: "google" })).toEqual({
      idp_hint: "google",
    });
  });

  it("never forwards anything else — Auth.js would put it on the URL as-is", () => {
    const params = authorizationParams({
      mode: "sign-in",
      email: "not an email",
      provider: "redirect_uri=https://evil.example",
    });
    expect(params).toEqual({});
  });
});

describe("returnPath", () => {
  it("keeps a path on this site", () => {
    expect(returnPath("/proposals/42?from=orangecat")).toBe("/proposals/42?from=orangecat");
  });

  it("refuses another site, however it is written", () => {
    expect(returnPath("//evil.example")).toBe("/account");
    expect(returnPath("https://evil.example")).toBe("/account");
    expect(returnPath(undefined)).toBe("/account");
  });
});
