"use client";

import { DictationField, type DictationFieldProps } from "@bitbaum/chatkit/react";
import { useChatLabels } from "./use-chat-labels";

/**
 * Every text box a person types words into in Solon (fleet AGENTS.md, "The
 * experience belongs to the package"): chatkit's DictationField with the
 * microphone on /api/transcribe and every word in the reader's language. A
 * bare `<textarea>` has no microphone, so there is none here.
 */
export function TextBox(props: Omit<DictationFieldProps, "labels">) {
  const { composer } = useChatLabels();
  return (
    <DictationField
      voice={{ transcribeUrl: "/api/transcribe" }}
      {...props}
      labels={{
        voice: composer.voice,
        voiceStop: composer.voiceStop,
        cancelRecording: composer.cancelRecording,
        confirmRecording: composer.confirmRecording,
        transcribing: composer.transcribing,
        listening: composer.listening,
        retryTake: composer.retryTake,
        dismiss: composer.dismiss,
        dictation: composer.dictation,
      }}
    />
  );
}
