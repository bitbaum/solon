"use client";

import { useEffect, useRef, useState } from "react";
import { readEventStream } from "@bitbaum/ai-kit/sse";
import { useTranslations } from "next-intl";
import {
  ChatScreen,
  ChatStarters,
  ChatThread,
  Composer,
  type ChatMessageData,
} from "@bitbaum/chatkit/react";
import type { LawChatEvent } from "@/lib/chat/events";
import { Link } from "@/i18n/navigation";
import type { AskScope } from "@/lib/law/ask/scope";

type Citations = NonNullable<ChatMessageData["citations"]>;

/**
 * Ask the law a question in plain words, in any language, and read the answer
 * with the provisions it rests on. Public: the law is. The chat is chatkit's, as
 * in Loki and OrangeCat; what is Solon's is the engine behind /api/law/ask.
 */
export function LawChat({
  scope,
  title,
  starters,
  placeholder,
}: {
  /** Asked from a place's page: its law is always searched, and "here" means it. */
  scope?: AskScope;
  title?: string;
  starters?: string[];
  placeholder?: string;
} = {}) {
  const t = useTranslations("Law.ask");
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [partial, setPartial] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [stopped, setStopped] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  async function ask(text: string, retry = false): Promise<boolean> {
    if (request.current) return false;
    const history = messages.filter((m) => !m.failed);
    if (!retry) history.push({ id: crypto.randomUUID(), role: "user", content: text });
    const controller = new AbortController();
    request.current = controller;
    setMessages(history);
    setBusy(true);
    setStopped(false);
    setPartial("");
    setStatus(t("steps.plan"));
    try {
      const response = await fetch("/api/law/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.slice(-20).map(({ role, content }) => ({ role, content })),
          scope,
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || t("failed"));
      }
      if (!response.body) throw new Error(t("failed"));
      let complete = false;
      let answer = "";
      let citations: Citations = {};
      await readEventStream<LawChatEvent>(response.body, (event) => {
        if (controller.signal.aborted) return;
        if (event.type === "error") throw new Error(event.error);
        if (event.type === "step") setStatus(t(`steps.${event.step}`));
        if (event.type === "sources") {
          citations = Object.fromEntries(
            event.sources.map(({ id, label, detail, href }) => [id, { label, detail, href }]),
          );
        }
        if (event.type === "text") {
          answer += event.text ?? "";
          setPartial(answer);
        }
        if (event.type === "done" && event.text?.trim()) {
          complete = true;
          setMessages([
            ...history,
            { id: crypto.randomUUID(), role: "assistant", content: event.text, citations },
          ]);
        }
      });
      if (!complete && !controller.signal.aborted) throw new Error(t("failed"));
    } catch (error) {
      if (!controller.signal.aborted)
        setMessages([
          ...history,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: error instanceof Error ? error.message : t("failed"),
            failed: true,
          },
        ]);
    } finally {
      if (request.current === controller) {
        request.current = null;
        setBusy(false);
        setPartial("");
      }
    }
    return true;
  }

  const stop = () => {
    request.current?.abort();
    setStopped(true);
  };
  return (
    <section className="solon-chat" aria-label={title ?? t("title")}>
      <ChatScreen
        fill="parent"
        header={
          <>
            <strong>{title ?? t("title")}</strong>
            <button
              type="button"
              className="ck-glass"
              onClick={() => {
                request.current?.abort();
                setMessages([]);
                setStopped(false);
              }}
            >
              {t("new")}
            </button>
          </>
        }
        composer={
          <Composer
            onSend={(text) => ask(text)}
            sending={busy}
            onStop={stop}
            placeholder={placeholder ?? t("placeholder")}
            voice={{ transcribeUrl: "/api/transcribe" }}
          />
        }
        footnote={t("footnote")}
      >
        <ChatThread
          messages={messages}
          live={busy ? { text: partial, status } : null}
          stopped={stopped}
          onStop={stop}
          onRetry={() => {
            void ask("", true);
          }}
          onReply={(text) => void ask(text)}
          renderLink={({ href, internal, className, children }) =>
            internal ? (
              <Link href={href} className={className}>
                {children}
              </Link>
            ) : (
              <a href={href} className={className} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            )
          }
          empty={
            <ChatStarters
              title={t("startersTitle")}
              starters={starters ?? [t("starters.one"), t("starters.two"), t("starters.three")]}
              onPick={(text) => void ask(text)}
            />
          }
        />
      </ChatScreen>
      <nav className="flex flex-wrap gap-4 pt-4" aria-label={t("title")}>
        <Link href="/law">{t("findLaw")}</Link>
        <Link href="/law/coverage">{t("coverage")}</Link>
      </nav>
    </section>
  );
}
