"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Translates the page being read when its reader asks, then shows it: the
 * server translates what it does not hold yet and the page is drawn again
 * from the cache. Until then the authentic words stay on the page.
 *
 * It used to ask on every page view. Anything that runs a page's script did
 * that too, and on 14 Nov 2026 Solon's law translation spent the free AI day
 * every app on the server shares before anyone was awake (the server's usage
 * log, Loki → Settings → AI). A tap is a person. What one reader has had
 * translated is stored, so the next reader of that language sees it at once.
 */
export default function TranslationLoader({
  act,
  page,
  to,
  labels,
}: {
  act: string;
  page: number;
  to: string;
  labels: { translate: string; translating: string; failed: string };
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "working" | "failed">("idle");

  function translate() {
    setState("working");
    fetch("/api/law/translate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ act, page, to }),
    })
      .then((r) => {
        if (r.ok) router.refresh();
        else setState("failed");
      })
      .catch(() => setState("failed"));
  }

  if (state === "idle")
    return (
      <button type="button" onClick={translate} className="btn-secondary min-h-11">
        {labels.translate}
      </button>
    );
  return (
    <p role="status" className="mb-0 text-sm text-fg-tertiary">
      {state === "working" ? labels.translating : labels.failed}
    </p>
  );
}
