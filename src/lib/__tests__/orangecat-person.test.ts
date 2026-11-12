/**
 * Asking OrangeCat whether two accounts are one person.
 *
 * The answer has three shapes and the difference between them is the whole
 * point: a tag, "cannot be told apart" (no tag), and "could not ask". A seat
 * decision that read the third as the second would seat a person twice
 * whenever OrangeCat was slow.
 */
import { describe, expect, it, vi } from "vitest";
import { personTagFor, personTagScope } from "@/lib/orangecat-person";

const ACTOR = "11111111-1111-4111-8111-111111111111";
const TAG = "ab".repeat(32);
const creds = { clientId: "solon", clientSecret: "s3cret", issuer: "https://oc.test" };

function answering(status: number, body: unknown) {
  return vi.fn(
    async () => new Response(JSON.stringify(body), { status }),
  ) as unknown as typeof fetch;
}

describe("personTagFor", () => {
  it("asks within the organization's own scope and returns the tag", async () => {
    const fetchMock = answering(200, { tags: { [ACTOR]: TAG } });
    const answer = await personTagFor(ACTOR.toUpperCase(), "org-7", { ...creds, fetch: fetchMock });
    expect(answer).toEqual({ ok: true, tag: TAG });
    const [url, init] = (fetchMock as unknown as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(url).toBe("https://oc.test/oauth/person-tags");
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      client_id: "solon",
      client_secret: "s3cret",
      scope: "org:org-7",
      subjects: [ACTOR],
    });
  });

  it("scopes to the organization, never a constant, so tags do not link seats across organizations", () => {
    expect(personTagScope("a")).not.toBe(personTagScope("b"));
  });

  it("says 'cannot be told apart' for an account OrangeCat gave no tag", async () => {
    const answer = await personTagFor(ACTOR, "org-7", {
      ...creds,
      fetch: answering(200, { tags: {} }),
    });
    expect(answer).toEqual({ ok: true, tag: null });
  });

  it("does not ask at all for an account that is not OrangeCat's, or with no client configured", async () => {
    const fetchMock = answering(200, { tags: {} });
    expect(await personTagFor("acct_local_123", "org-7", { ...creds, fetch: fetchMock })).toEqual({
      ok: true,
      tag: null,
    });
    expect(await personTagFor(null, "org-7", { ...creds, fetch: fetchMock })).toEqual({
      ok: true,
      tag: null,
    });
    expect(
      await personTagFor(ACTOR, "org-7", { clientId: "", clientSecret: "", fetch: fetchMock }),
    ).toEqual({ ok: true, tag: null });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("says 'could not ask', not 'no tag', when OrangeCat refuses, breaks or is unreachable", async () => {
    for (const status of [401, 403, 500, 503]) {
      const answer = await personTagFor(ACTOR, "org-7", { ...creds, fetch: answering(status, {}) });
      expect(answer.ok).toBe(false);
    }
    const down = vi.fn(async () => {
      throw new Error("connect ECONNREFUSED");
    }) as unknown as typeof fetch;
    expect(await personTagFor(ACTOR, "org-7", { ...creds, fetch: down })).toEqual({
      ok: false,
      reason: "connect ECONNREFUSED",
    });
  });

  it("treats an answer that is not a tag as broken, never as a tag to store", async () => {
    for (const tags of [{ [ACTOR]: "short" }, { [ACTOR]: 7 }, { [ACTOR]: null }]) {
      const answer = await personTagFor(ACTOR, "org-7", {
        ...creds,
        fetch: answering(200, { tags }),
      });
      expect(answer.ok).toBe(false);
    }
    expect((await personTagFor(ACTOR, "org-7", { ...creds, fetch: answering(200, {}) })).ok).toBe(
      false,
    );
  });
});
