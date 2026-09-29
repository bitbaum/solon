import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { placesConfig } from "@/lib/config/places";
import { findLiterals, literalProblem, registryKeys } from "../guards/no-literals";
import { withTestland } from "./fixtures/testland/config";

const testlandKeys = registryKeys(withTestland(placesConfig));

describe("literalProblem", () => {
  it.each([
    ["testland", "country pack"],
    ["parish", 'level of pack "testland"'],
    ["test.multiplier", "metric"],
    ["testland_register", "identifier scheme"],
    ["testland-register", "source"],
  ])("refuses the registry key %s", (literal, registry) => {
    expect(literalProblem(literal, testlandKeys)).toContain(registry);
  });

  it.each(["CH", "CH-ZH", "CHF", "XTS", "04-01"])("refuses the code %s", (literal) => {
    expect(literalProblem(literal, new Map())).not.toBeNull();
  });

  it.each([
    "state",
    "part_of",
    "tariff",
    "OK",
    "ZZZ",
    "13-01",
    "en",
    "progressive",
    "text-fg-primary",
  ])("lets %s through", (literal) => {
    expect(literalProblem(literal, testlandKeys)).toBeNull();
  });

  it("exempts the engine's own vocabulary even when a pack reuses the word", () => {
    expect(literalProblem("state", new Map([["state", "level of pack x"]]))).toBeNull();
  });
});

describe("findLiterals", () => {
  it("finds literals in code and JSX, and ignores module paths", () => {
    const source = [
      'import { x } from "CH";',
      'const currency = "CHF";',
      'const el = <Flag code="CH" />;',
      "const start = `04-01`;",
    ].join("\n");
    expect(findLiterals("x.tsx", source, new Map()).map((f) => [f.line, f.literal])).toEqual([
      [2, "CHF"],
      [3, "CH"],
      [4, "04-01"],
    ]);
  });
});

function* engineFiles(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      if (entry !== "__tests__") {
        yield* engineFiles(path);
      }
    } else if (/\.tsx?$/.test(entry)) {
      yield path;
    }
  }
}

describe("the engine", () => {
  it("names nothing of Testland: a pack changes no engine file", () => {
    const findings = [...engineFiles(join(process.cwd(), "src/lib/places"))].flatMap((path) =>
      findLiterals(path, readFileSync(path, "utf8"), testlandKeys).map(
        (f) => `${path}:${f.line} ${f.literal}`,
      ),
    );
    expect(findings).toEqual([]);
  });
});
