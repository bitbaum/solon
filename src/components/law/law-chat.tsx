"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { localConversationStore } from "@bitbaum/chatkit";
import { ChatApp } from "@bitbaum/chatkit/react";
import { chatComposer } from "@/components/chat/composer-config";
import { useChatLabels } from "@/components/chat/use-chat-labels";
import { Link } from "@/i18n/navigation";
import type { Proposal } from "@/lib/law/ask/consult";
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
  startersTitle,
  placeholder,
  storeKey = "solon-law",
  proposal,
}: {
  /** Asked from a place's page: its law is always searched, and "here" means it. */
  scope?: AskScope;
  title?: string;
  starters?: string[];
  /** The line above the starters; "What does the law say?" by default. */
  startersTitle?: string;
  placeholder?: string;
  /** Where this chat's conversations are kept on the device. */
  storeKey?: string;
  /** While drafting a change: the draft, sent with each question so the answer weighs it. */
  proposal?: Proposal | null;
} = {}) {
  const t = useTranslations("Law.ask");
  const locale = useLocale();
  const labels = useChatLabels();
  const store = useMemo(() => localConversationStore({ key: storeKey }), [storeKey]);
  // The scope is a fresh object each render; the chat follows what it names.
  const place = scope?.place;
  const authorities = scope?.authorities.join(",");
  const topic = scope?.topic;
  // The draft, as text: the transport is rebuilt when it changes, so each turn sends the latest.
  const draft = proposal === undefined ? undefined : JSON.stringify(proposal);
  const transport = useMemo(
    () =>
      lawTransport(
        place && authorities !== undefined
          ? { place, authorities: authorities ? authorities.split(",") : [], topic }
          : undefined,
        {
          step: (step) => t(`steps.${step}`),
          activity: (kind, detail) => t(`activity.${kind}`, { detail }),
          failed: t("failed"),
        },
        draft === undefined ? undefined : () => JSON.parse(draft) as Proposal | null,
      ),
    [place, authorities, topic, t, draft],
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
        startersTitle={startersTitle ?? t("startersTitle")}
        placeholder={placeholder ?? t("placeholder")}
        composer={chatComposer(labels)}
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
