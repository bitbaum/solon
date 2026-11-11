"use client";

import { useMemo } from "react";
import { readEventStream } from "@bitbaum/ai-kit/sse";
import { useLocale, useTranslations } from "next-intl";
import { localConversationStore } from "@bitbaum/chatkit";
import { ChatApp, ChatTurnError, type ChatTransport } from "@bitbaum/chatkit/react";
import { textAttachmentsOf } from "@/lib/chat/attachments";
import type { ChatEvent } from "@/lib/chat/events";
import { Link, useRouter } from "@/i18n/navigation";
import { chatComposer } from "./composer-config";
import { useChatLabels } from "./use-chat-labels";

/**
 * Ask Solon about the rules, the ways to decide, or a proposal to draft. The
 * whole chat is chatkit's ChatApp, as in the fleet's other apps; what is
 * Solon's is /api/chat. Signed out, sending leads to sign-in and back here.
 */
export function GovernanceChat({ signedIn }: { signedIn: boolean }) {
  const locale = useLocale();
  const router = useRouter();
  const labels = useChatLabels();
  const t = useTranslations("AskSolon");
  const store = useMemo(() => localConversationStore({ key: "solon-ask" }), []);
  const transport = useMemo<ChatTransport>(
    () => async (turn) => {
      if (!signedIn) {
        router.push("/sign-in?from=/ask");
        throw new ChatTurnError(t("errors.signIn"));
      }
      const messages = [
        ...turn.history
          .filter((m) => !m.failed && (m.role === "user" || m.role === "assistant"))
          .map(({ role, content }) => ({ role, content })),
        { role: "user", content: turn.text },
      ].slice(-20);
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          messages,
          attachments: textAttachmentsOf(turn.attachments),
        }),
        signal: turn.signal,
      });
      if (!response.ok) {
        // The reader's words, chosen by status: the server's own sentence is English.
        const message =
          response.status === 401
            ? t("errors.signIn")
            : response.status === 413
              ? t("errors.tooLong")
              : response.status === 429
                ? t("errors.rateLimited")
                : response.status === 503
                  ? t("errors.unavailable")
                  : t("errors.failed");
        throw new ChatTurnError(message);
      }
      if (!response.body) throw new ChatTurnError(t("errors.noAnswer"));
      turn.update({ status: t("status") });
      let text = "";
      let answer = "";
      await readEventStream<ChatEvent>(response.body, (event) => {
        if (event.type === "error") throw new ChatTurnError(t("errors.failed"));
        if (event.type === "text") {
          text += event.text ?? "";
          turn.update({ text });
        }
        if (event.type === "done") answer = event.text ?? "";
      });
      if (!answer.trim()) throw new ChatTurnError(t("errors.interrupted"));
      return answer;
    },
    [signedIn, locale, router, t],
  );
  return (
    <section className="solon-chat" aria-label={t("title")}>
      <ChatApp
        name={t("title")}
        transport={transport}
        store={store}
        rememberKey="solon-ask:open"
        fill="parent"
        locale={locale}
        railQuery="not all"
        starters={[t("starters.one"), t("starters.two"), t("starters.three")]}
        startersTitle={t("startersTitle")}
        placeholder={t("placeholder")}
        composer={chatComposer(labels)}
        thread={{
          labels: labels.thread,
          share: { title: t("title") },
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
            {signedIn ? (
              t("draftsNote")
            ) : (
              <Link href="/sign-in?from=/ask" className="underline">
                {t("signInLink")}
              </Link>
            )}{" "}
            ·{" "}
            <Link href="/governance/methods" className="underline">
              {t("methods")}
            </Link>{" "}
            ·{" "}
            <Link href="/proposals" className="underline">
              {t("record")}
            </Link>
          </>
        }
      />
    </section>
  );
}
