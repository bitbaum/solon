"use client";

import { useMemo } from "react";
import { readEventStream } from "@bitbaum/ai-kit/sse";
import { useLocale } from "next-intl";
import { localConversationStore } from "@bitbaum/chatkit";
import { ChatApp, ChatTurnError, type ChatTransport } from "@bitbaum/chatkit/react";
import type { ChatEvent } from "@/lib/chat/events";
import { Link, useRouter } from "@/i18n/navigation";
import { useChatLabels } from "./use-chat-labels";

const FAILED = "Solon could not answer. Try again.";

/**
 * Ask Solon about the rules, the ways to decide, or a proposal to draft. The
 * whole chat is chatkit's ChatApp, as in the fleet's other apps; what is
 * Solon's is /api/chat. Signed out, sending leads to sign-in and back here.
 */
export function GovernanceChat({ signedIn }: { signedIn: boolean }) {
  const locale = useLocale();
  const router = useRouter();
  const labels = useChatLabels();
  const store = useMemo(() => localConversationStore({ key: "solon-ask" }), []);
  const transport = useMemo<ChatTransport>(
    () => async (turn) => {
      if (!signedIn) {
        router.push("/sign-in?from=/ask");
        throw new ChatTurnError("Sign in to ask Solon. You will come back here.");
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
        body: JSON.stringify({ locale, messages }),
        signal: turn.signal,
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new ChatTurnError(data.error || FAILED);
      }
      if (!response.body) throw new ChatTurnError("The answer did not arrive. Try again.");
      turn.update({ status: "Reading the governance rules" });
      let text = "";
      let answer = "";
      await readEventStream<ChatEvent>(response.body, (event) => {
        if (event.type === "error") throw new ChatTurnError(event.error || FAILED);
        if (event.type === "text") {
          text += event.text ?? "";
          turn.update({ text });
        }
        if (event.type === "done") answer = event.text ?? "";
      });
      if (!answer.trim()) throw new ChatTurnError("The answer was interrupted. Try again.");
      return answer;
    },
    [signedIn, locale, router],
  );
  return (
    <section className="solon-chat" aria-label="Ask Solon">
      <ChatApp
        name="Ask Solon"
        transport={transport}
        store={store}
        rememberKey="solon-ask:open"
        fill="parent"
        locale={locale}
        railQuery="not all"
        starters={[
          "Who can decide what?",
          "Compare the governance profiles",
          "Help me draft a proposal",
        ]}
        startersTitle="Make the next decision clearer."
        placeholder="Ask about a decision, or draft a proposal…"
        composer={{
          voice: { transcribeUrl: "/api/transcribe" },
          // /api/chat reads words, not files.
          attach: false,
          labels: labels.composer,
        }}
        thread={{
          labels: labels.thread,
          share: { title: "Ask Solon" },
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
              "Drafts are not decisions."
            ) : (
              <Link href="/sign-in?from=/ask" className="underline">
                Sign in to ask Solon
              </Link>
            )}{" "}
            ·{" "}
            <Link href="/governance/methods" className="underline">
              Read the voting rules
            </Link>{" "}
            ·{" "}
            <Link href="/proposals" className="underline">
              Read the decision record
            </Link>
          </>
        }
      />
    </section>
  );
}
