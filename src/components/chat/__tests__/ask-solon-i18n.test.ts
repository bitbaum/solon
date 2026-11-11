import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const LOCALES = ["de", "fr", "it", "ru"] as const;
const read = (locale: string) =>
  JSON.parse(readFileSync(join(process.cwd(), `messages/${locale}.json`), "utf8"))
    .AskSolon as Record<string, unknown>;
const flat = (value: unknown, prefix = ""): Record<string, string> =>
  value && typeof value === "object"
    ? Object.assign(
        {},
        ...Object.entries(value).map(([k, v]) => flat(v, prefix ? `${prefix}.${k}` : k)),
      )
    : { [prefix]: String(value) };

describe("Ask Solon speaks the reader's language", () => {
  const en = flat(read("en"));

  it.each(LOCALES)("%s has every AskSolon string, none left in English", (locale) => {
    const own = flat(read(locale));
    expect(Object.keys(en).filter((key) => !(key in own))).toEqual([]);
    expect(Object.keys(en).filter((key) => own[key] === en[key])).toEqual([]);
  });

  it("the chat and its page hold no English sentence of their own", () => {
    for (const file of [
      "src/components/chat/governance-chat.tsx",
      "src/app/[locale]/ask/page.tsx",
    ]) {
      const text = readFileSync(join(process.cwd(), file), "utf8");
      // A quoted run of English words: user-facing copy belongs in messages/*.json.
      const literals = [...text.matchAll(/(["'])([A-Z][a-z]+(?: [A-Za-z’']+){2,}[.?…]?)\1/g)].map(
        (m) => m[2],
      );
      expect(literals, file).toEqual([]);
    }
  });

  it("the chat never prints the server's own error text", () => {
    const text = readFileSync(
      join(process.cwd(), "src/components/chat/governance-chat.tsx"),
      "utf8",
    );
    expect(text).not.toMatch(/data\.error|event\.error/);
  });
});
