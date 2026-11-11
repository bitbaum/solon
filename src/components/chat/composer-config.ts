import type { ComponentProps } from "react";
import type { ChatApp } from "@bitbaum/chatkit/react";
import { TEXT_ATTACHMENT_LIMITS } from "@/lib/chat/attachments";
import type { ChatLabels } from "./use-chat-labels";

/**
 * The composer every Solon chat has: the microphone on /api/transcribe (for
 * anyone the chat serves, signed in or not) and the paperclip for text files
 * (the backends read words and text, not pictures, so Files is the only source).
 * Both chats take this; turning either off needs a reason on the line
 * (`// experience-exempt: <why>`), and a test enforces that.
 */
export function chatComposer(
  labels: ChatLabels,
): NonNullable<ComponentProps<typeof ChatApp>["composer"]> {
  return {
    voice: { transcribeUrl: "/api/transcribe" },
    attach: { sources: ["files"], ...TEXT_ATTACHMENT_LIMITS },
    labels: labels.composer,
  };
}
