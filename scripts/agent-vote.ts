/**
 * Reference agent signer: cast a Bitcoin-signed vote from an agent's own box.
 *
 * The private key never leaves the agent's environment — Solon only ever sees
 * the signature. This is the script OC (the Cat) and FC (Loki) run; a vote
 * cast with it is that system's attested judgment.
 *
 * Usage:
 *   SOLON_AGENT_PRIVKEY=<hex> npx tsx scripts/agent-vote.ts \
 *     --base-url https://solon.orangecat.ch --session <sessionId> --choice yes
 *
 * --key-env <NAME> reads the key from a different env var (e.g. CAT_SOLON_PRIVKEY).
 */
import { parseArgs } from "node:util";
import * as secp from "@noble/secp256k1";
import { deriveAddresses, signMessage, voteMessage } from "../src/lib/bitcoin/message";

const { values } = parseArgs({
  options: {
    "base-url": { type: "string", default: "https://solon.orangecat.ch" },
    session: { type: "string" },
    choice: { type: "string" },
    "key-env": { type: "string", default: "SOLON_AGENT_PRIVKEY" },
  },
});

async function main() {
  const { session, choice } = values;
  if (!session || !choice) {
    console.error("required: --session <sessionId> --choice yes|no|abstain");
    process.exit(1);
  }
  if (!["yes", "no", "abstain"].includes(choice)) {
    console.error(`--choice must be yes, no or abstain, got ${choice}`);
    process.exit(1);
  }
  const keyEnv = values["key-env"] ?? "SOLON_AGENT_PRIVKEY";
  const privateKeyHex = process.env[keyEnv];
  if (!privateKeyHex) {
    console.error(
      `env ${keyEnv} is not set — the agent's private key lives in its own env, nowhere else`,
    );
    process.exit(1);
  }

  const publicKeyHex = secp.etc.bytesToHex(
    secp.getPublicKey(secp.etc.hexToBytes(privateKeyHex), true),
  );
  const address = deriveAddresses(publicKeyHex).p2pkh;
  const message = voteMessage({ sessionId: session, choice, memberAddress: address });
  const signature = signMessage(message, privateKeyHex);

  console.log(`voting as ${address} on session ${session}: ${choice}`);
  const res = await fetch(`${values["base-url"]}/api/sessions/${session}/votes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ choice, address, signature }),
  });
  const verdict = await res.json();
  console.log(JSON.stringify(verdict, null, 2));
  if (!verdict.stored) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
