"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

/**
 * Shares the page it sits on: the phone's own share sheet where there is one,
 * else the link copied. Nothing is sent anywhere by Solon.
 */
export default function ShareButton({ title }: { title: string }) {
  const t = useTranslations("Places.share");
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = window.location.href.split("#")[0]!;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // Dismissed, or not allowed here: copying is the way left.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // No clipboard either: the address bar still holds the link.
    }
  };
  return (
    <button type="button" onClick={share} className="btn-secondary min-h-11 shrink-0">
      <span aria-live="polite">{copied ? t("copied") : t("button")}</span>
    </button>
  );
}
