import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Composer, DEFAULT_COMPOSER_LABELS } from "@bitbaum/chatkit/react";
import { chatComposer } from "../composer-config";
import { buildChatLabels, type Translate } from "../use-chat-labels";

const LOCALES = ["en", "de", "fr", "it", "ru"] as const;
const messages = (locale: string) =>
  JSON.parse(readFileSync(join(process.cwd(), `messages/${locale}.json`), "utf8")) as {
    Chat: Record<string, unknown>;
  };

const flat = (value: unknown, prefix = ""): Record<string, string> =>
  value && typeof value === "object"
    ? Object.assign(
        {},
        ...Object.entries(value).map(([k, v]) => flat(v, prefix ? `${prefix}.${k}` : k)),
      )
    : { [prefix]: String(value) };

/** A translator over one locale's `Chat` namespace; a missing key throws, as next-intl would fall back. */
const translator = (locale: string): Translate => {
  const strings = flat(messages(locale).Chat);
  const raw = (key: string) => {
    const text = strings[key];
    if (text === undefined) throw new Error(`Chat.${key} is missing in ${locale}`);
    return text;
  };
  const t = (key: string, values: Record<string, string | number> = {}) =>
    raw(key).replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? ""));
  return Object.assign(t, { raw });
};

describe("every chat has the fleet's composer, in the reader's language", () => {
  const en = flat(messages("en").Chat);

  it.each(LOCALES.filter((l) => l !== "en"))("%s translates every Chat label", (locale) => {
    const own = flat(messages(locale).Chat);
    expect(Object.keys(en).filter((k) => !(k in own))).toEqual([]);
  });

  it.each(LOCALES.filter((l) => l !== "en"))(
    "%s: no composer or dictation label is chatkit's English default",
    (locale) => {
      const labels = buildChatLabels(translator(locale)).composer;
      const defaults = DEFAULT_COMPOSER_LABELS;
      const same: string[] = [];
      for (const [key, value] of Object.entries(labels)) {
        const base = (defaults as Record<string, unknown>)[key];
        if (typeof value === "string" && value === base) same.push(key);
      }
      for (const [key, value] of Object.entries(labels.dictation ?? {}))
        if (value === (defaults.dictation as Record<string, string>)[key])
          same.push(`dictation.${key}`);
      const notes = labels.attachNotes ?? {};
      expect(typeof notes.wrongType).toBe("function");
      for (const key of ["wrongType", "unreadable"] as const)
        expect(notes[key]?.("a.txt")).not.toBe(defaults.attachNotes[key]("a.txt"));
      expect(same).toEqual([]);
    },
  );

  it.each(LOCALES)(
    "%s: the composer shows an attach button in Files-only form and a mic config",
    (locale) => {
      const labels = buildChatLabels(translator(locale));
      const config = chatComposer(labels);
      // The microphone is client-only (it needs the browser), so its presence is the config; hidden on a server render.
      expect(config.voice).toMatchObject({ transcribeUrl: "/api/transcribe" });
      expect(config.attach).toMatchObject({ sources: ["files"] });
      const html = renderToStaticMarkup(
        createElement(Composer, {
          onSend: async () => true,
          voice: config.voice,
          attach: config.attach,
          labels: config.labels,
        } as never),
      );
      expect(html).toContain(labels.composer.attach as string);
      if (locale !== "en") expect(html).not.toContain(DEFAULT_COMPOSER_LABELS.attach);
      expect(html).not.toContain("Camera");
      expect(html).not.toContain("Photos");
    },
  );
});

describe("chats keep voice and attachments on", () => {
  const sources = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) return name === "__tests__" ? [] : sources(path);
      return /\.tsx?$/.test(name) ? [path] : [];
    });

  it("no ChatApp or Composer switches attachments or voice off without a reason on the line", () => {
    const offenders: string[] = [];
    for (const file of sources(join(process.cwd(), "src"))) {
      const text = readFileSync(file, "utf8");
      if (!/<(ChatApp|Composer)\b/.test(text)) continue;
      text.split("\n").forEach((line, i) => {
        if (
          /\b(attach|voice)\s*[:=]\s*\{?\s*false\b/.test(line) &&
          !/experience-exempt:\s*\S.{19,}/.test(line)
        )
          offenders.push(`${file}:${i + 1}: ${line.trim()}`);
      });
    }
    expect(offenders).toEqual([]);
  });

  it("both chats take the shared composer", () => {
    for (const file of [
      "src/components/law/law-chat.tsx",
      "src/components/chat/governance-chat.tsx",
    ]) {
      const text = readFileSync(join(process.cwd(), file), "utf8");
      expect(text, file).toContain("composer={chatComposer(labels)}");
    }
  });
});
