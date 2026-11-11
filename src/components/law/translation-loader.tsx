"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Asks once for the translation of the page being read, then shows it: the
 * server translates what it does not hold yet and the page is drawn again
 * from the cache. Until then the authentic words stay on the page.
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
  labels: { translating: string; failed: string };
}) {
  const router = useRouter();
  const [state, setState] = useState<"working" | "failed">("working");
  useEffect(() => {
    let live = true;
    fetch("/api/law/translate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ act, page, to }),
    })
      .then((r) => {
        if (!live) return;
        if (r.ok) router.refresh();
        else setState("failed");
      })
      .catch(() => live && setState("failed"));
    return () => {
      live = false;
    };
  }, [act, page, to, router]);
  return (
    <p role="status" className="mb-0 text-sm text-fg-tertiary">
      {state === "working" ? labels.translating : labels.failed}
    </p>
  );
}
