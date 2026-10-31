"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { localConversationStore } from "@bitbaum/chatkit";
import { ChatApp } from "@bitbaum/chatkit/react";
import { useChatLabels } from "@/components/chat/use-chat-labels";
import { Link } from "@/i18n/navigation";
import type { AskScope } from "@/lib/law/ask/scope";
import { lawTransport } from "./law-transport";

/**
 * Ask the law a question in plain words, in any language, and read the answer
 * with the provisions it rests on. The whole chat is chatkit's ChatApp, as in
 * Substrata, evig and OrangeCat: chats kept on this device, New chat, Stop,
 * Retry, Copy · Listen · Share under every answer and the steps it took. What
 * is Solon's is the engine behind /api/law/ask (law-transport.ts).
 */
export function LawChat({
  scope,
  title,
  starters,
  placeholder,
  storeKey = "solon-law",
}: {
  /** Asked from a place's page: its law is always searched, and "here" means it. */
  scope?: AskScope;
  title?: string;
  starters?: string[];
  placeholder?: string;
  /** Where this chat's conversations are kept on the device. */
  storeKey?: string;
} = {}) {
  const t = useTranslations("Law.ask");
  const locale = useLocale();
  const labels = useChatLabels();
  const store = useMemo(() => localConversationStore({ key: storeKey }), [storeKey]);
  // The scope is a fresh object each render; the chat follows what it names.
  const place = scope?.place;
  const authorities = scope?.authorities.join(",");
  const topic = scope?.topic;
  const transport = useMemo(
    () =>
      lawTransport(
        place && authorities !== undefined
          ? { place, authorities: authorities ? authorities.split(",") : [], topic }
          : undefined,
        { step: (step) => t(`steps.${step}`), failed: t("failed") },
      ),
    [place, authorities, topic, t],
  );
  const name = title ?? t("title");
  return (
    <section className="solon-chat" aria-label={name}>
      <ChatApp
        name={name}
        transport={transport}
        store={store}
        rememberKey={`${storeKey}:open`}
        fill="parent"
        locale={locale}
        railQuery="not all"
        temporaryChats={false}
        starters={starters ?? [t("starters.one"), t("starters.two"), t("starters.three")]}
        startersTitle={t("startersTitle")}
        placeholder={placeholder ?? t("placeholder")}
        composer={{
          voice: { transcribeUrl: "/api/transcribe" },
          // /api/law/ask reads words, not files.
          attach: false,
          labels: labels.composer,
        }}
        thread={{
          labels: labels.thread,
          share: { title: name },
          renderLink: ({ href, internal, className, children }) =>
            internal ? (
              <Link href={href} className={className}>
                {children}
              </Link>
            ) : (
              <a href={href} className={className} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            ),
        }}
        labels={labels.app}
        footnote={
          <>
            {t("footnote")}{" "}
            <Link href="/law" className="underline">
              {t("findLaw")}
            </Link>{" "}
            ·{" "}
            <Link href="/law/coverage" className="underline">
              {t("coverage")}
            </Link>
          </>
        }
      />
    </section>
  );
}
