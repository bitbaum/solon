"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

interface SupportButtonProps {
  amendmentId: string;
  revision: number;
  supports: boolean;
  signedIn: boolean;
  signInHref: string;
}

/**
 * Support a proposal, or withdraw that support: one click for a signed-in
 * account, recorded as a new row either way. The one primary action on the
 * proposal's page.
 */
export default function SupportButton(props: SupportButtonProps) {
  const t = useTranslations("Amend.amendment");
  const router = useRouter();
  const [supports, setSupports] = useState(props.supports);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!props.signedIn) {
    return (
      <a
        href={props.signInHref}
        className="btn-primary inline-flex w-full justify-center sm:w-auto"
      >
        {t("signInToSupport")}
      </a>
    );
  }

  async function act() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/law/amendments/${props.amendmentId}/support`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ revision: props.revision, kind: supports ? "withdraw" : "support" }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(t("supportFailed", { reason: body.error ?? String(res.status) }));
        return;
      }
      setSupports(!supports);
      router.refresh();
    } catch {
      setError(t("supportFailed", { reason: "network" }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      {supports && <p className="text-sm text-fg-secondary">{t("youSupport")}</p>}
      <button
        type="button"
        onClick={act}
        disabled={busy}
        className={`${supports ? "btn-frame" : "btn-primary"} w-full sm:w-auto`}
      >
        {supports ? t("withdrawButton") : t("supportButton")}
      </button>
      {error && (
        <p role="alert" className="text-sm text-fg-primary">
          {error}
        </p>
      )}
    </div>
  );
}
