import { afterEach, describe, expect, it, vi } from "vitest";
import { signInMethods } from "@bitbaum/accountkit/auth";
import { authMail, authSite, mailConfigured } from "@/lib/auth/mail";
import { lostPasswordWays } from "@/lib/auth/recovery";

/**
 * Password recovery in both states. With no account mail, the sign-in screen
 * offers no reset and no sign-in link — and still shows a way back. Once the
 * mail env exists, the shared recovery appears and its email really goes out.
 * The key below is a made-up test value; no request leaves the test.
 */
const TEST_KEY = "re_test_not_a_real_key";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("account mail not configured", () => {
  it("offers no reset and no sign-in link, and shows the ways that exist", () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("NODE_ENV", "production");
    expect(mailConfigured()).toBe(false);

    const methods = signInMethods(process.env, mailConfigured());
    expect(methods.passwordReset).toBe(false);
    expect(methods.magicLink).toBe(false);
    expect(lostPasswordWays(methods)).toEqual(["passkey", "contact"]);
  });

  it("names OrangeCat only when it is switched on here", () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ORANGECAT_OAUTH_CLIENT_ID", "solon");
    vi.stubEnv("ORANGECAT_OAUTH_CLIENT_SECRET", "test-secret");
    const methods = signInMethods(process.env, mailConfigured());
    expect(lostPasswordWays(methods)).toEqual(["passkey", "orangecat", "contact"]);
  });

  it("treats a placeholder key as not configured", () => {
    vi.stubEnv("RESEND_API_KEY", "re_placeholder");
    expect(mailConfigured()).toBe(false);
  });
});

describe("account mail configured", () => {
  it("offers the shared recovery and the sign-in link, and no fallback", () => {
    vi.stubEnv("RESEND_API_KEY", TEST_KEY);
    vi.stubEnv("NODE_ENV", "production");
    expect(mailConfigured()).toBe(true);

    const methods = signInMethods(process.env, mailConfigured());
    expect(methods.passwordReset).toBe(true);
    expect(methods.magicLink).toBe(true);
    expect(lostPasswordWays(methods)).toEqual([]);
  });

  it("sends the reset link from Solon's fleet sender through mail-kit", async () => {
    vi.stubEnv("RESEND_API_KEY", TEST_KEY);
    vi.stubEnv("RESEND_FROM", "");
    const fetch = vi.fn(async () => Response.json({ id: "test" }));
    vi.stubGlobal("fetch", fetch);

    const link = `${authSite.url}/sign-in?token=abc`;
    await authMail.send("reset", "citizen@example.ch", link);

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    const body = JSON.parse(String(init.body));
    expect(body.to).toEqual(["citizen@example.ch"]);
    expect(body.from).toBe("Solon <solon@fleetcrown.orangecat.ch>");
    expect(body.subject).toBe("Reset your Solon password");
    expect(body.text).toContain(link);
  });

  it("never mails a link to another origin", async () => {
    vi.stubEnv("RESEND_API_KEY", TEST_KEY);
    const fetch = vi.fn(async () => Response.json({ id: "test" }));
    vi.stubGlobal("fetch", fetch);
    vi.spyOn(console, "error").mockImplementation(() => {});

    await authMail.send("reset", "citizen@example.ch", "https://evil.example/sign-in?token=abc");
    expect(fetch).not.toHaveBeenCalled();
  });
});
