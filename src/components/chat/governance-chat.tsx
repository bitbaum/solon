"use client";

import { useEffect, useRef, useState } from "react";
import { readEventStream } from "@bitbaum/ai-kit/sse";
import { useLocale } from "next-intl";
import {
  ChatScreen,
  ChatStarters,
  ChatThread,
  Composer,
  type ChatMessageData,
} from "@bitbaum/chatkit/react";
import type { ChatEvent } from "@/lib/chat/events";
import { Link, useRouter } from "@/i18n/navigation";

export function GovernanceChat({ signedIn }: { signedIn: boolean }) {
  const locale = useLocale();
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [partial, setPartial] = useState("");
  const [busy, setBusy] = useState(false);
  const [stopped, setStopped] = useState(false);
  const [model, setModel] = useState("");
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  async function ask(text: string, retry = false): Promise<boolean> {
    if (request.current || !signedIn) return false;
    const history = messages.filter((m) => !m.failed);
    if (!retry) history.push({ id: crypto.randomUUID(), role: "user", content: text });
    const controller = new AbortController();
    request.current = controller;
    setMessages(history);
    setBusy(true);
    setStopped(false);
    setPartial("");
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          messages: history.slice(-20).map(({ role, content }) => ({ role, content })),
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Solon could not answer. Try again.");
      }
      if (!response.body) throw new Error("The answer did not arrive. Try again.");
      let complete = false;
      let text = "";
      await readEventStream<ChatEvent>(response.body, (event) => {
        if (controller.signal.aborted) return;
        if (event.type === "error") throw new Error(event.error);
        if (event.type === "text") {
          text += event.text ?? "";
          setPartial(text);
        }
        if (event.type === "done" && event.text?.trim()) {
          complete = true;
          setMessages([
            ...history,
            { id: crypto.randomUUID(), role: "assistant", content: event.text },
          ]);
          setModel(event.model ?? "");
        }
      });
      if (!complete && !controller.signal.aborted)
        throw new Error("The answer was interrupted. Try again.");
    } catch (err) {
      if (!controller.signal.aborted)
        setMessages([
          ...history,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: err instanceof Error ? err.message : "Solon could not answer. Try again.",
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
  const send = (text: string) => {
    if (!signedIn) {
      router.push("/sign-in?from=/ask");
      return;
    }
    void ask(text);
  };
  const stop = () => {
    request.current?.abort();
    setStopped(true);
  };
  return (
    <section className="solon-chat" aria-label="Ask Solon">
      <ChatScreen
        fill="parent"
        header={
          <>
            <strong>Solon</strong>
            <button
              type="button"
              className="ck-glass"
              onClick={() => {
                request.current?.abort();
                setMessages([]);
                setStopped(false);
                setModel("");
              }}
            >
              New conversation
            </button>
          </>
        }
        composer={
          signedIn ? (
            <Composer
              onSend={(text) => ask(text)}
              sending={busy}
              onStop={stop}
              placeholder="Ask about a decision, or draft a proposal…"
              voice={{ transcribeUrl: "/api/transcribe" }}
            />
          ) : (
            <Link className="ck-glass" href="/sign-in?from=/ask">
              Sign in to ask Solon
            </Link>
          )
        }
        footnote={
          model
            ? `Answered by ${model}. Drafts are not decisions.`
            : "A conversation stays in this tab. Drafts are not decisions."
        }
      >
        <ChatThread
          messages={messages}
          live={busy ? { text: partial, status: "Reading the governance rules" } : null}
          stopped={stopped}
          onStop={stop}
          onRetry={() => {
            void ask("", true);
          }}
          onReply={signedIn ? send : undefined}
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
              title="Make the next decision clearer."
              starters={[
                "Who can decide what?",
                "Compare the governance profiles",
                "Help me draft a proposal",
              ]}
              onPick={send}
            />
          }
        />
      </ChatScreen>
      <nav className="flex flex-wrap gap-4 pt-4" aria-label="Continue with Solon">
        <Link href="/governance/methods">Read the voting rules</Link>
        <Link href="/propose">Draft a proposal</Link>
        <Link href="/proposals">Read the decision record</Link>
      </nav>
    </section>
  );
}
