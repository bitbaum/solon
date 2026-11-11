"use client";

/**
 * The words on every chat in Solon, translated once (the wording is evig's).
 *
 * Every chat is `@bitbaum/chatkit` (fleet rule); chatkit ships English labels
 * and takes overrides. This hook reads the `chat` message namespace and hands
 * back the two override objects, so each chat passes `labels={labels.thread}`
 * and `labels={labels.composer}` and none of them re-translates "Copy".
 * A whole chat app (`ChatApp`) takes `labels={labels.app}` too.
 */

import { useTranslations } from "next-intl";
import type { ChatAppLabels, ComposerLabelOverrides, ThreadLabels } from "@bitbaum/chatkit/react";

export interface ChatLabels {
  thread: Partial<ThreadLabels>;
  composer: ComposerLabelOverrides;
  /** The chat app's own words: the list, New chat, Temporary chat, Rename. */
  app: Partial<ChatAppLabels>;
}

export type Translate = (key: string, values?: Record<string, string | number>) => string;

/** The chat words from a translator over the `Chat` namespace; the hook below binds it to next-intl, a test to the message files. */
export function buildChatLabels(t: Translate): ChatLabels {
  return {
    thread: {
      copy: t("copy"),
      copied: t("copied"),
      listen: t("listen"),
      share: t("share"),
      retry: t("retry"),
      stop: t("stop"),
      working: t("working"),
      stopped: t("stopped"),
      jump: t("jump"),
      failed: t("failed"),
      loading: t("loading"),
      replies: t("replies"),
      // A template: chatkit fills in {time} itself.
      thoughtFor: t.raw("thoughtFor") as string,
      thought: t("thought"),
      thinking: t("thinking"),
    },
    composer: {
      send: t("send"),
      stop: t("stop"),
      voice: t("voice"),
      voiceStop: t("voiceStop"),
      cancelRecording: t("cancelRecording"),
      confirmRecording: t("confirmRecording"),
      listening: t("listening"),
      transcribing: t("transcribing"),
      attach: t("attach"),
      attachMenu: {
        title: t("attachMenu.title"),
        close: t("attachMenu.close"),
        sources: { files: t("attachMenu.files") },
      },
      remove: (name) => t("attachRemove", { name }),
      attachNotes: {
        wrongType: (name) => t("attachNotes.wrongType", { name }),
        textTooLarge: (name, k) => t("attachNotes.textTooLarge", { name, k }),
        unreadable: (name) => t("attachNotes.unreadable", { name }),
        tooMany: (max) => t("attachNotes.tooMany", { max }),
      },
      queue: t("queue"),
      dismiss: t("dismiss"),
      retryTake: t("retryTake"),
      dictation: {
        mic: t("dictation.mic"),
        silence: t("dictation.silence"),
        unavailable: t("dictation.unavailable"),
        fileTooLarge: t("dictation.fileTooLarge"),
        signIn: t("dictation.signIn"),
        busy: t("dictation.busy"),
      },
    },
    app: {
      chats: t("app.chats"),
      openChats: t("app.openChats"),
      closeChats: t("app.closeChats"),
      newChat: t("app.newChat"),
      untitled: t("app.untitled"),
      more: t("app.more"),
      temporary: t("app.temporary"),
      temporaryNote: t("app.temporaryNote"),
      share: t("app.share"),
      rename: t("app.rename"),
      renameField: t("app.renameField"),
      delete: t("app.delete"),
      deleteAsk: (title) => t("app.deleteAsk", { title }),
      save: t("app.save"),
      cancel: t("app.cancel"),
      search: t("app.search"),
      today: t("app.today"),
      yesterday: t("app.yesterday"),
      earlier: t("app.earlier"),
      noChats: t("app.noChats"),
      noMatch: (query) => t("app.noMatch", { query }),
      loadingChats: t("app.loadingChats"),
      listFailed: t("app.listFailed"),
      tryAgain: t("app.tryAgain"),
      answering: t("app.answering"),
      chatActions: (title) => t("app.chatActions", { title }),
      queued: t("app.queued"),
      unqueue: (text) => t("app.unqueue", { text }),
      dismiss: t("app.dismiss"),
      problems: {
        load: t("app.problems.load"),
        save: t("app.problems.save"),
        open: t("app.problems.open"),
      },
    },
  };
}

export function useChatLabels(): ChatLabels {
  return buildChatLabels(useTranslations("Chat") as unknown as Translate);
}
