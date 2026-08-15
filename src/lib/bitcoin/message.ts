/**
 * Real Bitcoin "Signed Message" cryptography — the math that replaces trust.
 *
 * A Solon vote is only valid if it carries an ECDSA signature that
 * cryptographically recovers to the voting member's own Bitcoin address.
 * No central authority is asked whether a vote is real; the signature
 * either verifies against the public key or it does not.
 *
 * Implements the standard Bitcoin Signed Message format (the same one
 * Bitcoin Core's `signmessage`/`verifymessage` and Electrum use):
 *   magic   = "\x18Bitcoin Signed Message:\n"
 *   preimage = magic || varint(len(msg)) || msg
 *   digest   = sha256(sha256(preimage))
 *   sig      = base64( header(1) || r(32) || s(32) )  with a recovery id
 *
 * Pure JS (audited @noble primitives) so it builds as a standalone bundle
 * with no native addons.
 */
import * as secp from '@noble/secp256k1';
import { sha256 } from '@noble/hashes/sha2.js';
import { ripemd160 } from '@noble/hashes/legacy.js';
import { hmac } from '@noble/hashes/hmac.js';
import { bech32 } from '@scure/base';
import bs58check from 'bs58check';

// @noble/secp256k1 ships no hash implementation; the synchronous API needs both
// wired before first use (sha256 for the curve's own checks, HMAC-SHA256 for
// RFC6979 deterministic nonces). Deterministic nonces are why the same vote
// signed twice produces identical bytes — asserted by the known-answer tests.
secp.hashes.sha256 = sha256;
secp.hashes.hmacSha256 = (key, msg) => hmac(sha256, key, msg);

const MAGIC = new TextEncoder().encode('Bitcoin Signed Message:\n');

/** Bitcoin varint (CompactSize) for lengths we actually hit (< 0xfd common). */
function varint(n: number): Uint8Array {
  if (n < 0xfd) return Uint8Array.of(n);
  if (n <= 0xffff) return Uint8Array.of(0xfd, n & 0xff, (n >> 8) & 0xff);
  return Uint8Array.of(0xfe, n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff);
}

function doubleSha256(bytes: Uint8Array): Uint8Array {
  return sha256(sha256(bytes));
}

/** The 32-byte digest that gets signed for a given UTF-8 message. */
export function messageDigest(message: string): Uint8Array {
  const msg = new TextEncoder().encode(message);
  const preimage = secp.etc.concatBytes(MAGIC.length < 0xfd ? Uint8Array.of(MAGIC.length) : varint(MAGIC.length), MAGIC, varint(msg.length), msg);
  return doubleSha256(preimage);
}

function hash160(bytes: Uint8Array): Uint8Array {
  return ripemd160(sha256(bytes));
}

/** Mainnet P2PKH address (version 0x00) for a public key. */
function p2pkhAddress(pubkey: Uint8Array): string {
  return bs58check.encode(secp.etc.concatBytes(Uint8Array.of(0x00), hash160(pubkey)));
}

/** Mainnet native-segwit P2WPKH (bech32, bc1q…) for a compressed public key. */
function p2wpkhAddress(pubkey: Uint8Array): string {
  const words = [0, ...bech32.toWords(hash160(pubkey))];
  return bech32.encode('bc', words);
}

/** Mainnet P2SH-wrapped segwit (3…) for a compressed public key. */
function p2shP2wpkhAddress(pubkey: Uint8Array): string {
  const redeemScript = secp.etc.concatBytes(Uint8Array.of(0x00, 0x14), hash160(pubkey));
  return bs58check.encode(secp.etc.concatBytes(Uint8Array.of(0x05), hash160(redeemScript)));
}

/** All standard mainnet addresses for a compressed public key (hex). */
export function deriveAddresses(publicKeyHex: string): {
  p2pkh: string;
  p2wpkh: string;
  p2shP2wpkh: string;
} {
  const pub = secp.etc.hexToBytes(publicKeyHex);
  return {
    p2pkh: p2pkhAddress(pub),
    p2wpkh: p2wpkhAddress(pub),
    p2shP2wpkh: p2shP2wpkhAddress(pub),
  };
}

export interface BitcoinKeyPair {
  privateKeyHex: string;
  publicKeyHex: string;
  address: string;
}

/** Generate a fresh secp256k1 key pair + its P2PKH address (for members/tests). */
export function generateKeyPair(): BitcoinKeyPair {
  const priv = secp.utils.randomSecretKey();
  const pub = secp.getPublicKey(priv, true);
  return {
    privateKeyHex: secp.etc.bytesToHex(priv),
    publicKeyHex: secp.etc.bytesToHex(pub),
    address: p2pkhAddress(pub),
  };
}

/**
 * Sign a message with a private key, producing a standard base64 Bitcoin
 * message signature (65 bytes: header || r || s).
 */
export function signMessage(message: string, privateKeyHex: string): string {
  const digest = messageDigest(message);
  // `prehash: false` because the Bitcoin digest is already the double-sha256
  // above; letting the library hash again would sign the wrong value. The
  // 'recovered' encoding is 65 bytes laid out recovery || r || s.
  const sig = secp.sign(digest, secp.etc.hexToBytes(privateKeyHex), {
    prehash: false,
    format: 'recovered',
  });
  // Compressed-key recovery header: 31..34 = 27 + recovery + 4 (compressed).
  const header = 27 + sig[0] + 4;
  const out = secp.etc.concatBytes(Uint8Array.of(header), sig.subarray(1));
  return Buffer.from(out).toString('base64');
}

export interface VerifyResult {
  valid: boolean;
  /** Address recovered from the signature, when recoverable. */
  recoveredAddress?: string;
  reason?: string;
}

/**
 * Verify that `signatureBase64` is a valid Bitcoin signed-message signature
 * for `message` by the holder of `address`.
 *
 * Accepts the full BIP137 header range (27–42: uncompressed/compressed P2PKH,
 * P2SH-P2WPKH, P2WPKH) and, for compressed keys, matches the claimed address
 * against ALL standard derivations of the recovered key. That covers wallets
 * that set the segwit header bits (Sparrow, Bitcoin Core) AND wallets that
 * sign segwit addresses with the legacy compressed header (Electrum).
 */
export function verifyMessage(message: string, address: string, signatureBase64: string): VerifyResult {
  let raw: Buffer;
  try {
    raw = Buffer.from(signatureBase64, 'base64');
  } catch {
    return { valid: false, reason: 'signature is not valid base64' };
  }
  if (raw.length !== 65) return { valid: false, reason: `signature must be 65 bytes, got ${raw.length}` };

  const header = raw[0];
  if (header < 27 || header > 42) return { valid: false, reason: `invalid header byte ${header}` };
  const compressed = header >= 31;
  const recovery = (header - 27) & 0x03;

  try {
    const digest = messageDigest(message);
    // Rebuild the library's 'recovered' encoding (recovery || r || s) from the
    // Bitcoin layout (header || r || s) — same 64 signature bytes, different
    // first byte. Copy into a plain Uint8Array: `raw` is a Buffer view over a
    // pooled allocation, and the length checks are strict about that.
    const recoveredSig = secp.etc.concatBytes(
      Uint8Array.of(recovery),
      Uint8Array.from(raw.subarray(1)),
    );
    const recoveredKey = secp.recoverPublicKey(recoveredSig, digest, { prehash: false });
    const pub = secp.Point.fromBytes(recoveredKey).toBytes(compressed);

    const candidates = compressed
      ? [p2pkhAddress(pub), p2wpkhAddress(pub), p2shP2wpkhAddress(pub)]
      : [p2pkhAddress(pub)];
    const valid = candidates.includes(address);
    return { valid, recoveredAddress: candidates[0], ...(valid ? {} : { reason: 'recovered key does not derive the claimed address' }) };
  } catch (e) {
    return { valid: false, reason: e instanceof Error ? e.message : 'recovery failed' };
  }
}

/**
 * Canonical message a member signs to cast a vote. Binding the session id,
 * choice, and member address into the signed text means a signature can't be
 * lifted onto a different vote, choice, or session.
 */
export function voteMessage(params: { sessionId: string; choice: string; memberAddress: string }): string {
  return `Solon vote\nsession:${params.sessionId}\nchoice:${params.choice}\nvoter:${params.memberAddress}`;
}

/**
 * Canonical message a member signs to file a proposal. Binds the organization,
 * category, title, proposer, and (for policy changes) the sha256 of the exact
 * proposed content — so a proposal can't be altered after signing.
 */
export function proposalMessage(params: {
  orgSlug: string;
  category: string;
  title: string;
  proposerAddress: string;
  contentHash?: string | null;
}): string {
  const base = `Solon proposal\norg:${params.orgSlug}\ncategory:${params.category}\ntitle:${params.title}\nproposer:${params.proposerAddress}`;
  return params.contentHash ? `${base}\ncontent:${params.contentHash}` : base;
}

/**
 * Canonical message signed to bind a Bitcoin address to an OrangeCat identity.
 * The actor id is inside the signed text on purpose: without it a signature
 * proving control of an address could be replayed by anyone who saw it to bind
 * that address to *their* account. Signing this says "this OrangeCat account
 * and this key are the same person", which is exactly what the roster claims.
 */
export function registrationMessage(params: {
  orgSlug: string;
  actorId: string;
  memberAddress: string;
}): string {
  return `Solon membership\norg:${params.orgSlug}\nactor:${params.actorId}\naddress:${params.memberAddress}`;
}
