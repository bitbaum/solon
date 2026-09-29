/**
 * The engine names no country (design §1, §12). This finds the string
 * literals in engine code that would: a registry key (pack, level, metric,
 * identifier scheme, source, instrument kind), an ISO 3166 region or
 * subdivision code, an ISO 4217 currency code, or a month-day.
 *
 * It has no list of its own. Keys come from the registries the caller passes;
 * codes are recognised by `Intl` (CLDR). A registry key that is also a word of
 * the engine's own vocabulary (a pack with a level called "state") is not a
 * literal about the world, so the vocabulary is exempt.
 */
import ts from "typescript";
import type { PlacesConfig } from "@/lib/config/places/schema";
import * as vocabulary from "../vocabulary";

export interface LiteralFinding {
  line: number;
  literal: string;
  reason: string;
}

const regions = new Intl.DisplayNames(["en"], { type: "region", fallback: "none" });
const currencies = new Intl.DisplayNames(["en"], { type: "currency", fallback: "none" });

const TWO_LETTERS = /^[A-Z]{2}$/;
const SUBDIVISION = /^([A-Z]{2})-[A-Z0-9]{1,3}$/;
const THREE_LETTERS = /^[A-Z]{3}$/;
const MONTH_DAY = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/** Every key the registries hold, named by the registry it came from. */
export function registryKeys(config: PlacesConfig): Map<string, string> {
  const keys = new Map<string, string>();
  const add = (key: string, registry: string) => keys.set(key, keys.get(key) ?? registry);
  for (const pack of config.packs) {
    add(pack.key, "country pack");
    for (const level of pack.levels) {
      add(level.key, `level of pack "${pack.key}"`);
    }
  }
  config.metrics.forEach((m) => add(m.key, "metric"));
  config.identifierSchemes.forEach((s) => add(s.key, "identifier scheme"));
  config.sources.forEach((s) => add(s.key, "source"));
  config.instrumentKinds.forEach((k) => add(k.key, "instrument kind"));
  return keys;
}

const ENGINE_WORDS = new Set(
  Object.values(vocabulary).flatMap((value) => (Array.isArray(value) ? (value as unknown[]) : [])),
);

/** Why a literal names the world, or null when it does not. */
export function literalProblem(literal: string, keys: ReadonlyMap<string, string>): string | null {
  const registry = keys.get(literal);
  if (registry && !ENGINE_WORDS.has(literal)) {
    return `a key of the ${registry} registry; read it from config`;
  }
  if (TWO_LETTERS.test(literal) && regions.of(literal) !== undefined) {
    return `the ISO 3166 region code of ${regions.of(literal)}`;
  }
  const subdivision = SUBDIVISION.exec(literal);
  if (subdivision && regions.of(subdivision[1]!) !== undefined) {
    return "an ISO 3166-2 subdivision code";
  }
  if (THREE_LETTERS.test(literal) && currencies.of(literal) !== undefined) {
    return `the ISO 4217 code of ${currencies.of(literal)}`;
  }
  if (MONTH_DAY.test(literal)) {
    return "a month-day; fiscal years and deadlines belong to the pack";
  }
  return null;
}

/** The literals in one source file that name the world. Module specifiers are not literals of the program. */
export function findLiterals(
  fileName: string,
  source: string,
  keys: ReadonlyMap<string, string>,
): LiteralFinding[] {
  const file = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true);
  const findings: LiteralFinding[] = [];
  const visit = (node: ts.Node) => {
    if (
      ts.isImportDeclaration(node) ||
      ts.isExportDeclaration(node) ||
      ts.isExternalModuleReference(node)
    ) {
      return;
    }
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const reason = literalProblem(node.text, keys);
      if (reason) {
        const { line } = file.getLineAndCharacterOfPosition(node.getStart(file));
        findings.push({ line: line + 1, literal: node.text, reason });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return findings;
}
