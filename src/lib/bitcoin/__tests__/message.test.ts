import { describe, expect, it } from "vitest";
import {
  deriveAddresses,
  generateKeyPair,
  proposalMessage,
  signMessage,
  verifyMessage,
  voteMessage,
} from "../message";

describe("voteMessage / proposalMessage canonical form", () => {
  it("voteMessage matches the golden string exactly (wallets sign these bytes)", () => {
    expect(
      voteMessage({ sessionId: "sess-1", choice: "yes", memberAddress: "1BitcoinEaterAddressDontSendf59kuE" }),
    ).toBe("Solon vote\nsession:sess-1\nchoice:yes\nvoter:1BitcoinEaterAddressDontSendf59kuE");
  });

  it("proposalMessage binds the content hash when present", () => {
    const base = proposalMessage({
      orgSlug: "orangecat",
      category: "ALLOCATION_POLICY",
      title: "Raise the ceiling",
      proposerAddress: "1abc",
    });
    expect(base).toBe(
      "Solon proposal\norg:orangecat\ncategory:ALLOCATION_POLICY\ntitle:Raise the ceiling\nproposer:1abc",
    );
    expect(
      proposalMessage({
        orgSlug: "orangecat",
        category: "ALLOCATION_POLICY",
        title: "Raise the ceiling",
        proposerAddress: "1abc",
        contentHash: "deadbeef",
      }),
    ).toBe(`${base}\ncontent:deadbeef`);
  });
});

describe("sign/verify roundtrip", () => {
  const pair = generateKeyPair();
  const message = voteMessage({ sessionId: "s", choice: "yes", memberAddress: pair.address });
  const signature = signMessage(message, pair.privateKeyHex);

  it("verifies a valid signature against the P2PKH address", () => {
    const result = verifyMessage(message, pair.address, signature);
    expect(result.valid).toBe(true);
    expect(result.recoveredAddress).toBe(pair.address);
  });

  it("rejects a tampered message", () => {
    const tampered = voteMessage({ sessionId: "s", choice: "no", memberAddress: pair.address });
    expect(verifyMessage(tampered, pair.address, signature).valid).toBe(false);
  });

  it("rejects a signature replayed onto a different session", () => {
    const other = voteMessage({ sessionId: "s2", choice: "yes", memberAddress: pair.address });
    expect(verifyMessage(other, pair.address, signature).valid).toBe(false);
  });

  it("rejects the wrong address", () => {
    const other = generateKeyPair();
    expect(verifyMessage(message, other.address, signature).valid).toBe(false);
  });

  it("rejects garbage signatures without throwing", () => {
    expect(verifyMessage(message, pair.address, "not-base64!!").valid).toBe(false);
    expect(verifyMessage(message, pair.address, Buffer.from("short").toString("base64")).valid).toBe(false);
  });
});

describe("BIP137 segwit support", () => {
  const pair = generateKeyPair();
  const addrs = deriveAddresses(pair.publicKeyHex);

  it("derives distinct p2pkh / p2wpkh / p2sh-p2wpkh addresses", () => {
    expect(addrs.p2pkh.startsWith("1")).toBe(true);
    expect(addrs.p2wpkh.startsWith("bc1q")).toBe(true);
    expect(addrs.p2shP2wpkh.startsWith("3")).toBe(true);
  });

  it("accepts a legacy-header signature claiming the bech32 address (Electrum behavior)", () => {
    const message = voteMessage({ sessionId: "s", choice: "yes", memberAddress: addrs.p2wpkh });
    const signature = signMessage(message, pair.privateKeyHex);
    expect(verifyMessage(message, addrs.p2wpkh, signature).valid).toBe(true);
  });

  it("accepts a signature claiming the P2SH-wrapped address", () => {
    const message = voteMessage({ sessionId: "s", choice: "yes", memberAddress: addrs.p2shP2wpkh });
    const signature = signMessage(message, pair.privateKeyHex);
    expect(verifyMessage(message, addrs.p2shP2wpkh, signature).valid).toBe(true);
  });

  it("accepts BIP137 segwit header bytes (35-42) as produced by Sparrow/Core", () => {
    const message = voteMessage({ sessionId: "s", choice: "yes", memberAddress: addrs.p2wpkh });
    const legacy = Buffer.from(signMessage(message, pair.privateKeyHex), "base64");
    // Re-band the header from compressed-P2PKH (31-34) to P2WPKH (39-42).
    const rebanded = Buffer.from(legacy);
    rebanded[0] = legacy[0] - 31 + 39;
    expect(verifyMessage(message, addrs.p2wpkh, rebanded.toString("base64")).valid).toBe(true);
  });

  it("rejects header bytes outside 27-42", () => {
    const message = voteMessage({ sessionId: "s", choice: "yes", memberAddress: addrs.p2pkh });
    const sig = Buffer.from(signMessage(message, pair.privateKeyHex), "base64");
    sig[0] = 43;
    expect(verifyMessage(message, addrs.p2pkh, sig.toString("base64")).valid).toBe(false);
  });
});
