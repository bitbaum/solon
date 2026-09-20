/**
 * Did this PR change the constitution, and was that decided?
 *
 * Runs on pull requests. When `src/lib/config/governance.ts` is in the diff, it
 * looks for `Decision: <session id>` trailers in the PR's commits, fetches each
 * decision from Solon's public decisions endpoint, and recounts it (category,
 * outcome, every signature). Then it prints one of three things:
 *
 *   - nothing, when the constitution is untouched;
 *   - a notice naming the ratifying decision;
 *   - a warning, with a pre-filled link to the proposal that would ratify it.
 *
 * It ALWAYS exits 0. A rules change without a decision is not a build failure;
 * it is a fact the record must show, and a person must never be stuck in CI
 * over a governance question. The rule lives in lib/domain/ratification.ts;
 * this file only reads git, fetches, and prints.
 *
 * Env: BASE_SHA, HEAD_SHA (the PR's range), PR_URL, PR_TITLE, SOLON_URL
 * (default https://solon.orangecat.ch), GITHUB_STEP_SUMMARY (optional).
 * Run locally: BASE_SHA=main HEAD_SHA=HEAD pnpm exec tsx scripts/check-governance-ratified.ts
 */

import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import {
  assessDecision,
  decisionTrailers,
  ratificationHref,
  report,
  touchesConstitution,
  type Assessment,
} from "../src/lib/domain/ratification";
import type { DecisionDocument } from "../src/lib/domain/decision";

const base = process.env.BASE_SHA ?? "origin/main";
const head = process.env.HEAD_SHA ?? "HEAD";
const solon = (process.env.SOLON_URL ?? "https://solon.orangecat.ch").replace(/\/$/, "");
const prUrl = process.env.PR_URL ?? "";
const prTitle = process.env.PR_TITLE ?? "governance rules change";

function git(...args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8" });
}

async function fetchDecision(id: string): Promise<DecisionDocument | { error: string }> {
  try {
    const res = await fetch(`${solon}/api/v1/decisions/${encodeURIComponent(id)}`);
    const body = (await res.json()) as DecisionDocument | { error?: string };
    if (!res.ok) return { error: (body as { error?: string }).error ?? `HTTP ${res.status}` };
    return body as DecisionDocument;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "fetch failed" };
  }
}

async function main(): Promise<void> {
  const changed = git("diff", "--name-only", `${base}...${head}`).split("\n").filter(Boolean);
  const changedConstitution = touchesConstitution(changed);
  if (!changedConstitution) return;

  const messages = git("log", "--format=%B%x00", `${base}..${head}`).split("\0").filter(Boolean);
  const claims: Array<{ id: string; assessment: Assessment }> = [];
  for (const id of decisionTrailers(messages)) {
    const doc = await fetchDecision(id);
    claims.push({
      id,
      assessment: "error" in doc ? { ratified: false, reason: doc.error } : assessDecision(doc),
    });
  }

  const out = report({
    changedConstitution,
    claims,
    ratifyHref: `${solon}${ratificationHref({ subject: prTitle, url: prUrl })}`,
  });

  const file = "src/lib/config/governance.ts";
  const text = out.lines.join(" ");
  if (out.level === "warning") console.log(`::warning file=${file}::${text}`);
  if (out.level === "notice") console.log(`::notice file=${file}::${text}`);
  for (const line of out.lines) console.log(line);

  if (process.env.GITHUB_STEP_SUMMARY) {
    const heading =
      out.level === "warning"
        ? "⚠️ Governance rules changed"
        : "✅ Governance rules change ratified";
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `### ${heading}\n\n${out.lines.map((l) => (l.startsWith("http") ? `**[File the ratification proposal](${l})**` : l)).join("\n\n")}\n`,
    );
  }
}

main().catch((e) => {
  // Even a crash in this script is not a reason to block a merge.
  console.log(
    `::warning::governance ratification check could not run: ${e instanceof Error ? e.message : e}`,
  );
});
