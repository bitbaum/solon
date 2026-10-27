"use client";

import { readEventStream } from "@bitbaum/ai-kit/sse";
import { localConversationStore } from "@bitbaum/chatkit";
import { ChatApp, type ChatTransport } from "@bitbaum/chatkit/react";
import { useLocale } from "next-intl";
import { useMemo } from "react";
import type { ChatEvent } from "@/lib/chat/events";
import { Link } from "@/i18n/navigation";

const STARTERS = [
  "Who can decide what?",
  "Compare the governance profiles",
  "Help me draft a proposal",
];

/** The SSE read behind /api/chat, as ChatApp's transport: live text through `update`, a throw for a failed turn. */
function governanceTransport(locale: string): ChatTransport {
  return async ({ text, history, signal, update }) => {
    update({ status: "Reading the governance rules" });
    const messages = [...history, { role: "user" as const, content: text }]
      .slice(-20)
      .map(({ role, content }) => ({ role, content }));
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale, messages }),
      signal,
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error || "Solon could not answer. Try again.");
    }
    if (!response.body) throw new Error("The answer did not arrive. Try again.");
    let streamed = "";
    let answer = "";
    await readEventStream<ChatEvent>(response.body, (event) => {
      if (signal.aborted) return;
      if (event.type === "error") throw new Error(event.error);
      if (event.type === "text") {
        streamed += event.text ?? "";
        update({ text: streamed });
      }
      if (event.type === "done" && event.text?.trim()) answer = event.text;
    });
    if (!answer) throw new Error("The answer was interrupted. Try again.");
    return answer;
  };
}

export function GovernanceChat({ signedIn }: { signedIn: boolean }) {
  const locale = useLocale();
  const transport = useMemo(() => governanceTransport(locale), [locale]);
  // Device only: the server keeps no copy of a conversation.
  const store = useMemo(() => localConversationStore({ key: "solon-ask" }), []);
  return (
    <section className="solon-chat" aria-label="Ask Solon">
      {signedIn ? (
        <ChatApp
          name="Solon"
          fill="parent"
          store={store}
          rememberKey="solon-ask:open"
          locale={locale}
          transport={transport}
          placeholder="Ask about a decision, or draft a proposal…"
          starters={STARTERS}
          startersTitle="Make the next decision clearer."
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
          footnote="A conversation stays on this device. Drafts are not decisions."
        />
      ) : (
        <div className="flex flex-col items-start gap-4">
          <p>Sign in to ask Solon about the rules, compare ways to decide, or draft a proposal.</p>
          <Link className="btn-primary min-h-11" href="/sign-in?from=/ask">
            Sign in to ask Solon
          </Link>
        </div>
      )}
      <nav className="flex flex-wrap gap-4 pt-4" aria-label="Continue with Solon">
        <Link href="/governance/methods">Read the voting rules</Link>
        <Link href="/propose">Draft a proposal</Link>
        <Link href="/proposals">Read the decision record</Link>
      </nav>
    </section>
  );
}
