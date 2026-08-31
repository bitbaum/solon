import { createHash, createPublicKey, createVerify } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  deriveAddresses,
  generateKeyPair,
  messageDigest,
  proposalMessage,
  registrationMessage,
  signMessage,
  verifyMessage,
  voteMessage,
} from "../message";

describe("voteMessage / proposalMessage canonical form", () => {
  it("voteMessage matches the golden string exactly (wallets sign these bytes)", () => {
    expect(
      voteMessage({
        sessionId: "sess-1",
        choice: "yes",
        memberAddress: "1BitcoinEaterAddressDontSendf59kuE",
      }),
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

  it("registrationMessage binds the actor, so a signature cannot be replayed", () => {
    const args = { orgSlug: "orangecat", memberAddress: "1abc" };
    expect(registrationMessage({ ...args, actorId: "actor-1" })).toBe(
      "Solon membership\norg:orangecat\nactor:actor-1\naddress:1abc",
    );
    // Same key, same address, different OrangeCat account: different bytes,
    // so a signature seen by an attacker cannot bind that address to theirs.
    expect(registrationMessage({ ...args, actorId: "actor-2" })).not.toBe(
      registrationMessage({ ...args, actorId: "actor-1" }),
    );
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
    expect(
      verifyMessage(message, pair.address, Buffer.from("short").toString("base64")).valid,
    ).toBe(false);
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

/**
 * Every test above signs and verifies with the same code, so a change that
 * altered the wire format on BOTH sides would pass all of them while silently
 * invalidating every signature real wallets produce. These are the tests that
 * cannot do that: fixed inputs, fixed expected bytes, and one verification by
 * an implementation that is not ours.
 *
 * The key is secret exponent 1, so its public key is the published secp256k1
 * generator point G and its P2WPKH address is BIP173's own test vector — the
 * address assertions are anchored to a spec, not to our output.
 */
describe("known-answer vectors (the wire format itself)", () => {
  // Secret exponent 1. Its public key is G, from the secp256k1 domain parameters.
  const PRIV = "0000000000000000000000000000000000000000000000000000000000000001";
  const PUB_COMPRESSED = "0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798";
  const PUB_UNCOMPRESSED =
    "0479be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798" +
    "483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8";

  const message = voteMessage({
    sessionId: "sess-golden",
    choice: "yes",
    memberAddress: "1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH",
  });

  it("derives BIP173's published address vector from the generator point", () => {
    const addrs = deriveAddresses(PUB_COMPRESSED);
    // bc1qw508d6… is the worked P2WPKH example in BIP173 itself.
    expect(addrs.p2wpkh).toBe("bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4");
    expect(addrs.p2pkh).toBe("1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH");
    expect(addrs.p2shP2wpkh).toBe("3JvL6Ymt8MVWiCNHC7oWU6nLeHNJKLZGLN");
  });

  it("builds the Bitcoin signed-message digest byte for byte", () => {
    // The preimage, rebuilt here from the spec rather than imported:
    //   varint(len(magic)) || magic || varint(len(msg)) || msg, hashed twice.
    const magic = Buffer.from("Bitcoin Signed Message:\n", "utf8");
    const body = Buffer.from(message, "utf8");
    const preimage = Buffer.concat([Buffer.of(magic.length), magic, Buffer.of(body.length), body]);
    const expected = createHash("sha256")
      .update(createHash("sha256").update(preimage).digest())
      .digest();
    expect(Buffer.from(messageDigest(message)).equals(expected)).toBe(true);
  });

  it("produces the exact same signature bytes as before the noble upgrade", () => {
    // RFC6979 makes signing deterministic, so this base64 is stable across
    // library versions unless the nonce derivation or encoding changed.
    expect(signMessage(message, PRIV)).toBe(
      "IEkYf5eWkcGntfxF08TttykJ5IFhB2+mjLVJFtJMjzX7IhomOQyjsAJLxKX4cYU1nwQ/zp2MD5uoQrm+SdeFQRs=",
    );
  });

  it("signs something OpenSSL agrees is a valid secp256k1 ECDSA signature", () => {
    const raw = Buffer.from(signMessage(message, PRIV), "base64");

    // r||s -> DER, the only encoding OpenSSL accepts.
    const derInt = (b: Buffer): Buffer => {
      let i = 0;
      while (i < b.length - 1 && b[i] === 0) i++;
      let v = b.subarray(i);
      if (v[0] & 0x80) v = Buffer.concat([Buffer.of(0), v]);
      return Buffer.concat([Buffer.of(0x02, v.length), v]);
    };
    const sigBody = Buffer.concat([
      derInt(Buffer.from(raw.subarray(1, 33))),
      derInt(Buffer.from(raw.subarray(33, 65))),
    ]);
    const der = Buffer.concat([Buffer.of(0x30, sigBody.length), sigBody]);

    // SPKI header for an uncompressed secp256k1 (1.3.132.0.10) public key.
    const spkiPrefix = Buffer.from("3056301006072a8648ce3d020106052b8104000a034200", "hex");
    const key = createPublicKey({
      key: Buffer.concat([spkiPrefix, Buffer.from(PUB_UNCOMPRESSED, "hex")]),
      format: "der",
      type: "spki",
    });

    // Bitcoin signs sha256(sha256(preimage)); OpenSSL hashes once itself, so
    // feed it the inner hash and the value signed over is the same digest.
    const magic = Buffer.from("Bitcoin Signed Message:\n", "utf8");
    const body = Buffer.from(message, "utf8");
    const inner = createHash("sha256")
      .update(Buffer.concat([Buffer.of(magic.length), magic, Buffer.of(body.length), body]))
      .digest();

    expect(createVerify("sha256").update(inner).verify(key, der)).toBe(true);
  });
});
