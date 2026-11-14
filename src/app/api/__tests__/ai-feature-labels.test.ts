/**
 * Every model call Solon makes says what it is for.
 *
 * On 14 Nov 2026 Solon used up Groq's whole free day, shared by every app on
 * the server, before 09:10 UTC with nobody using any app. The server's usage
 * log (@bitbaum/ai-kit) could say "Solon" but not whether it was law
 * translation, a law question, statistics or chat. `feature` on each call
 * fills that in; this keeps a new call from arriving without one.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const API = join(process.cwd(), "src/app/api");

function routes(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "__tests__" ? [] : routes(path);
    return name === "route.ts" ? [path] : [];
  });
}

/** The argument text of each `name({ ... })` call, braces balanced. */
function calls(source: string, name: string): string[] {
  const out: string[] = [];
  const re = new RegExp(`\\b${name}\\(\\{`, "g");
  for (let m = re.exec(source); m; m = re.exec(source)) {
    let depth = 0;
    let i = m.index + name.length + 1;
    for (; i < source.length; i++) {
      if (source[i] === "{") depth++;
      else if (source[i] === "}" && --depth === 0) break;
    }
    out.push(source.slice(m.index, i + 1));
  }
  return out;
}

describe("AI feature labels", () => {
  const found = routes(API).flatMap((file) => {
    const source = readFileSync(file, "utf8");
    return ["complete", "completeStream", "transcribe"].flatMap((name) =>
      calls(source, name).map((text) => ({ file: file.slice(API.length + 1), name, text })),
    );
  });

  it("finds the routes that call a model", () => {
    expect(found.length).toBeGreaterThanOrEqual(10);
  });

  it.each(found.map((c) => [`${c.file} ${c.name}`, c] as const))("%s names its feature", (_, c) => {
    expect(c.text).toMatch(/\bfeature: "[a-z-]+"/);
  });
});
