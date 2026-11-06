import { describe, expect, it } from "vitest";
import { generateKeyPair, signMessage, verifyMessage } from "@/lib/bitcoin/message";
import { GENESIS, amendmentMessage, eventHash, revisionHash, verifyChain } from "../hash";
import { countSupport } from "../support";

const content = {
  authority: "gl",
  act: "act-1",
  baseVersion: "v-1",
  lang: "de",
  title: "Lower the dog tax",
  rationale: "Because.",
  changes: [{ op: "repeal" as const, path: "art_3", baseHash: "a".repeat(64) }],
};

describe("revisionHash", () => {
  it("does not depend on key order, and changes with any word", () => {
    const reordered = {
      changes: content.changes,
      title: content.title,
      rationale: content.rationale,
      lang: "de",
      baseVersion: "v-1",
      act: "act-1",
      authority: "gl",
    };
    expect(revisionHash(reordered)).toBe(revisionHash(content));
    expect(revisionHash({ ...content, rationale: "Because!" })).not.toBe(revisionHash(content));
  });
});

describe("amendmentMessage", () => {
  it("binds the act, the revision and the content, and cannot pass for another message", () => {
    const keys = generateKeyPair();
    const message = amendmentMessage({
      act: "support",
      amendmentId: "am-1",
      revision: 2,
      contentHash: revisionHash(content),
      address: keys.address,
    });
    expect(message.split("\n")[0]).toBe("Solon amendment");
    const signature = signMessage(message, keys.privateKeyHex);
    expect(verifyMessage(message, keys.address, signature).valid).toBe(true);
    const other = amendmentMessage({
      act: "support",
      amendmentId: "am-1",
      revision: 3,
      contentHash: revisionHash(content),
      address: keys.address,
    });
    expect(verifyMessage(other, keys.address, signature).valid).toBe(false);
  });
});

describe("the event chain", () => {
  const build = (n: number) => {
    const events = [];
    let prev = GENESIS;
    for (let seq = 1; seq <= n; seq++) {
      const event = {
        seq,
        prevHash: prev,
        type: "support",
        amendmentId: "am-1",
        payload: { n: seq },
      };
      const hash = eventHash(event);
      events.push({ ...event, hash });
      prev = hash;
    }
    return events;
  };

  it("verifies an unbroken chain and returns its head", () => {
    const events = build(5);
    expect(verifyChain(events)).toEqual({ ok: true, head: events[4]!.hash });
  });

  it("verifies a later run from the hash before it", () => {
    const events = build(5);
    expect(verifyChain(events.slice(2), { seq: 2, hash: events[1]!.hash }).ok).toBe(true);
  });

  it("finds an event removed, an event altered, and events swapped", () => {
    const events = build(5);
    expect(verifyChain([...events.slice(0, 2), ...events.slice(3)])).toMatchObject({
      ok: false,
      at: 4,
    });
    const altered = events.map((e) => (e.seq === 3 ? { ...e, payload: { n: 99 } } : e));
    expect(verifyChain(altered)).toMatchObject({ ok: false, at: 3 });
    const swapped = [events[0]!, events[2]!, events[1]!, events[3]!, events[4]!];
    expect(verifyChain(swapped)).toMatchObject({ ok: false, at: 3 });
  });
});

describe("countSupport", () => {
  const at = (s: number) => new Date(Date.UTC(2026, 10, 6, 12, 0, s));

  it("counts each supporter once, by their latest row, and keeps keys apart from accounts", () => {
    expect(
      countSupport([
        { supporter: "actor:a", kind: "support", proof: "ACCOUNT", recordedAt: at(1) },
        { supporter: "actor:a", kind: "support", proof: "ACCOUNT", recordedAt: at(2) },
        { supporter: "btc:x", kind: "support", proof: "BIP137", recordedAt: at(3) },
        { supporter: "actor:b", kind: "support", proof: "ACCOUNT", recordedAt: at(4) },
        { supporter: "actor:b", kind: "withdraw", proof: "ACCOUNT", recordedAt: at(5) },
      ]),
    ).toEqual({ total: 2, signed: 1, account: 1 });
  });

  it("does not depend on the order rows arrive in", () => {
    expect(
      countSupport([
        { supporter: "actor:b", kind: "withdraw", proof: "ACCOUNT", recordedAt: at(5) },
        { supporter: "actor:b", kind: "support", proof: "ACCOUNT", recordedAt: at(4) },
      ]).total,
    ).toBe(0);
  });
});
