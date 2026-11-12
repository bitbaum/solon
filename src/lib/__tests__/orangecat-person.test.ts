/**
 * Asking OrangeCat whether two accounts are one person.
 *
 * The answer has three shapes and the difference between them is the whole
 * point: a tag, "cannot be told apart" (no tag), and "could not ask". A seat
 * decision that read the third as the second would seat a person twice
 * whenever OrangeCat was slow.
 */
import { describe, expect, it, vi } from "vitest";
import {
  PERSON_TAG_BATCH,
  personTagFor,
  personTagScope,
  personTagsFor,
} from "@/lib/orangecat-person";

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

  it("does not ask at all for an account that is not OrangeCat's", async () => {
    const fetchMock = answering(200, { tags: {} });
    expect(await personTagFor("acct_local_123", "org-7", { ...creds, fetch: fetchMock })).toEqual({
      ok: true,
      tag: null,
    });
    expect(await personTagFor(null, "org-7", { ...creds, fetch: fetchMock })).toEqual({
      ok: true,
      tag: null,
    });
    // Not OrangeCat's is "cannot be told apart" even with no client configured.
    expect(
      await personTagFor("acct_local_123", "org-7", { clientId: "", clientSecret: "" }),
    ).toEqual({ ok: true, tag: null });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("says 'could not ask', not 'no tag', when no OrangeCat client is configured", async () => {
    const fetchMock = answering(200, { tags: { [ACTOR]: TAG } });
    expect(
      await personTagFor(ACTOR, "org-7", { clientId: "", clientSecret: "", fetch: fetchMock }),
    ).toEqual({ ok: false, reason: "no OrangeCat client configured" });
    expect(
      await personTagsFor([ACTOR], "org-7", { clientId: "x", clientSecret: "", fetch: fetchMock }),
    ).toEqual({ ok: false, reason: "no OrangeCat client configured" });
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

/** A distinct actor id per index, so a batch can be told apart from its order. */
function actor(i: number): string {
  return `${i.toString(16).padStart(8, "0")}-1111-4111-8111-111111111111`;
}

/** OrangeCat answering each subject with its own tag, except those it leaves out. */
function echoing(leaveOut: Set<string> = new Set(), failOnCall?: number) {
  let calls = 0;
  return vi.fn(async (_url: string, init?: RequestInit) => {
    calls++;
    if (calls === failOnCall) return new Response("{}", { status: 429 });
    const { subjects } = JSON.parse(init!.body as string) as { subjects: string[] };
    const tags = Object.fromEntries(
      subjects.filter((s) => !leaveOut.has(s)).map((s) => [s, s.slice(0, 8).repeat(8)]),
    );
    return new Response(JSON.stringify({ tags }), { status: 200 });
  }) as unknown as typeof fetch & ReturnType<typeof vi.fn>;
}

describe("personTagsFor", () => {
  it("asks for many accounts in one request, and says which it could not tell apart", async () => {
    const fetchMock = echoing(new Set([actor(2)]));
    const answer = await personTagsFor([actor(1), actor(2), "acct_local"], "org-7", {
      ...creds,
      fetch: fetchMock,
    });
    expect(answer).toEqual({
      ok: true,
      tags: { [actor(1)]: "00000001".repeat(8), [actor(2)]: null, acct_local: null },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
    expect(body.subjects).toEqual([actor(1), actor(2)]);
  });

  it("splits a long list into requests of at most the batch size OrangeCat accepts", async () => {
    const ids = Array.from({ length: 2 * PERSON_TAG_BATCH + 50 }, (_, i) => actor(i + 1));
    const fetchMock = echoing();
    const answer = await personTagsFor([...ids, ids[0]!.toUpperCase()], "org-7", {
      ...creds,
      fetch: fetchMock,
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    for (const [, init] of fetchMock.mock.calls) {
      const { subjects } = JSON.parse((init as RequestInit).body as string);
      expect(subjects.length).toBeLessThanOrEqual(PERSON_TAG_BATCH);
    }
    expect(answer.ok).toBe(true);
    if (!answer.ok) return;
    expect(Object.values(answer.tags).every((t) => t !== null)).toBe(true);
    expect(answer.tags[ids[0]!.toUpperCase()]).toBe(answer.tags[ids[0]!]);
  });

  it("is 'could not ask' as a whole when any one request fails", async () => {
    const ids = Array.from({ length: PERSON_TAG_BATCH + 1 }, (_, i) => actor(i + 1));
    const answer = await personTagsFor(ids, "org-7", { ...creds, fetch: echoing(new Set(), 2) });
    expect(answer).toEqual({ ok: false, reason: "OrangeCat answered 429" });
  });

  it("asks nothing for an empty list", async () => {
    const fetchMock = echoing();
    expect(await personTagsFor([], "org-7", { ...creds, fetch: fetchMock })).toEqual({
      ok: true,
      tags: {},
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
