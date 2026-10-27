"use client";

import { readEventStream } from "@bitbaum/ai-kit/sse";
import { localConversationStore } from "@bitbaum/chatkit";
import { ChatApp, type ChatMessageData, type ChatTransport } from "@bitbaum/chatkit/react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";
import type { LawChatEvent } from "@/lib/chat/events";
import { Link } from "@/i18n/navigation";

type Citations = NonNullable<ChatMessageData["citations"]>;
type Translate = (key: string) => string;

/** The SSE read behind /api/law/ask, as ChatApp's transport: steps as the status line, sources as citations. */
function lawTransport(t: Translate): ChatTransport {
  return async ({ text, history, signal, update }) => {
    update({ status: t("steps.plan") });
    const messages = [...history, { role: "user" as const, content: text }]
      .slice(-20)
      .map(({ role, content }) => ({ role, content }));
    const response = await fetch("/api/law/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
      signal,
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error || t("failed"));
    }
    if (!response.body) throw new Error(t("failed"));
    let streamed = "";
    let answer = "";
    let citations: Citations = {};
    await readEventStream<LawChatEvent>(response.body, (event) => {
      if (signal.aborted) return;
      if (event.type === "error") throw new Error(event.error);
      if (event.type === "step") update({ status: t(`steps.${event.step}`) });
      if (event.type === "sources") {
        citations = Object.fromEntries(
          event.sources.map(({ id, label, detail, href }) => [id, { label, detail, href }]),
        );
      }
      if (event.type === "text") {
        streamed += event.text ?? "";
        update({ text: streamed });
      }
      if (event.type === "done" && event.text?.trim()) answer = event.text;
    });
    if (!answer) throw new Error(t("failed"));
    return { content: answer, citations };
  };
}

/**
 * Ask the law a question in plain words, in any language, and read the answer
 * with the provisions it rests on. Public: the law is. The chat is chatkit's
 * ChatApp; what is Solon's is the engine behind /api/law/ask.
 */
export function LawChat() {
  const t = useTranslations("Law.ask");
  const locale = useLocale();
  const transport = useMemo(() => lawTransport((key) => t(key as never)), [t]);
  // Device only: the server keeps no copy of a question.
  const store = useMemo(() => localConversationStore({ key: "solon-law" }), []);
  return (
    <section className="solon-chat" aria-label={t("title")}>
      <ChatApp
        name={t("title")}
        fill="parent"
        store={store}
        rememberKey="solon-law:open"
        locale={locale}
        transport={transport}
        placeholder={t("placeholder")}
        starters={[t("starters.one"), t("starters.two"), t("starters.three")]}
        startersTitle={t("startersTitle")}
        composer={{ attach: false, voice: { transcribeUrl: "/api/transcribe" } }}
        thread={{
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
        footnote={t("footnote")}
      />
      <nav className="flex flex-wrap gap-4 pt-4" aria-label={t("title")}>
        <Link href="/law">{t("findLaw")}</Link>
        <Link href="/law/coverage">{t("coverage")}</Link>
      </nav>
    </section>
  );
}
