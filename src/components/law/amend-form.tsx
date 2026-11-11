"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { TextBox } from "@/components/chat/text-box";
import {
  provisionHash,
  redline,
  type Change,
  type ChangeProblem,
  type Provision,
} from "@/lib/law/amend/changes";
import type { Proposal } from "@/lib/law/ask/consult";
import { useDraft } from "./draft-store";
import { LawChat } from "./law-chat";
import Redline from "./redline";

type Op = "replace" | "repeal" | "insert";

/** One change as it is being written: the article, what to do, and the words. */
export interface DraftChange {
  key: string;
  op: Op;
  path: string | null;
  base: Provision | null;
  heading: string;
  text: string;
}

interface AmendFormProps {
  act: { id: string; title: string; lang: string };
  /** Every article's anchor and heading, in the act's order. */
  contents: { path: string; heading: string }[];
  /** The changes the form opens with: the article the reader came from, or a fork's. */
  initial: DraftChange[];
  initialTitle?: string;
  initialRationale?: string;
  /** The revision this is an alternative to, when it is one. */
  forkOf?: string;
  signedIn: boolean;
  /** Where "sign in" goes, carrying the reader back here. */
  signInHref: string;
  /** The act's official routes, shown above the "not law" sentence (a server-rendered slot). */
  routes?: ReactNode;
}

const newKey = () => Math.random().toString(36).slice(2, 10);
const emptyChange = (): DraftChange => ({
  key: newKey(),
  op: "replace",
  path: null,
  base: null,
  heading: "",
  text: "",
});

/** The words a draft would file, or null while it is not finished. */
function toChange(draft: DraftChange): Change | null {
  if (!draft.path || !draft.base) return null;
  if (draft.op === "repeal")
    return { op: "repeal", path: draft.path, baseHash: provisionHash(draft.base) };
  if (draft.op === "insert") {
    if (!draft.heading.trim() || !draft.text.trim()) return null;
    return { op: "insert", after: draft.path, heading: draft.heading.trim(), text: draft.text };
  }
  return {
    op: "replace",
    path: draft.path,
    baseHash: provisionHash(draft.base),
    ...(draft.heading !== draft.base.heading ? { heading: draft.heading } : {}),
    text: draft.text,
  };
}

/**
 * Propose a change to an act (design: docs/design/2026-11-amending-the-law.md):
 * one or more changes, each to one article, shown as a redline against the
 * published text while it is written. Filed through the amendment API by the
 * signed-in account. The draft is kept in this tab, so signing in on the way
 * loses nothing.
 */
export default function AmendForm(props: AmendFormProps) {
  const t = useTranslations("Amend");
  const router = useRouter();
  const storageKey = `solon:amend:${props.act.id}:${props.forkOf ?? ""}`;
  const first = useMemo(
    () => ({
      drafts: props.initial.length ? props.initial : [emptyChange()],
      title: props.initialTitle ?? "",
      rationale: props.initialRationale ?? "",
    }),
    [props.initial, props.initialTitle, props.initialRationale],
  );
  // The draft survives signing in on the way: it is kept for this tab (draft-store.ts).
  const [form, setForm, clearForm] = useDraft(storageKey, first);
  const { drafts, title, rationale } = form;
  // The draft as the assistant reads it: each change with today's words and the proposed ones.
  const proposal = useMemo<Proposal>(
    () => ({
      act: props.act.id,
      title: title.slice(0, 300) || undefined,
      reason: rationale.slice(0, 3000) || undefined,
      changes: drafts
        .filter((d) => d.base)
        .slice(0, 5)
        .map((d) => ({
          op: d.op,
          heading: (d.op === "insert" ? d.heading : d.base!.heading).slice(0, 300),
          current: d.op === "insert" ? "" : d.base!.text.slice(0, 4000),
          proposed: d.op === "repeal" ? "" : d.text.slice(0, 4000),
        })),
    }),
    [props.act.id, title, rationale, drafts],
  );
  const setDrafts = (f: (all: DraftChange[]) => DraftChange[]) =>
    setForm((prev) => ({ ...prev, drafts: f(prev.drafts) }));
  const setTitle = (value: string) => setForm((prev) => ({ ...prev, title: value }));
  const setRationale = (f: (r: string) => string) =>
    setForm((prev) => ({ ...prev, rationale: f(prev.rationale) }));
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [problems, setProblems] = useState<ChangeProblem[]>([]);

  const update = (key: string, patch: Partial<DraftChange>) =>
    setDrafts((all) => all.map((d) => (d.key === key ? { ...d, ...patch } : d)));

  async function choose(key: string, path: string) {
    update(key, { path, base: null });
    setLoading((l) => ({ ...l, [key]: true }));
    setFailed((f) => ({ ...f, [key]: false }));
    try {
      const params = new URLSearchParams({ act: props.act.id, path, lang: props.act.lang });
      const res = await fetch(`/api/v1/law/provisions?${params}`);
      if (!res.ok) throw new Error(String(res.status));
      const p = (await res.json()) as Provision;
      const base = { path: p.path, heading: p.heading, text: p.text };
      setDrafts((all) =>
        all.map((d) =>
          d.key === key
            ? {
                ...d,
                base,
                heading: d.op === "insert" ? "" : base.heading,
                text: d.op === "insert" ? "" : base.text,
              }
            : d,
        ),
      );
    } catch {
      setFailed((f) => ({ ...f, [key]: true }));
    } finally {
      setLoading((l) => ({ ...l, [key]: false }));
    }
  }

  const changes = useMemo(() => drafts.map(toChange), [drafts]);
  const ready = title.trim().length > 0 && changes.length > 0 && changes.every(Boolean);

  async function submit() {
    setBusy(true);
    setError(null);
    setProblems([]);
    const id = crypto.randomUUID();
    try {
      const res = await fetch("/api/v1/law/amendments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id,
          act: props.act.id,
          lang: props.act.lang,
          title,
          rationale,
          changes,
          ...(props.forkOf ? { forkOf: props.forkOf } : {}),
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        problems?: ChangeProblem[];
      };
      if (!res.ok) {
        setProblems(body.problems ?? []);
        setError(t("failed", { reason: body.error ?? String(res.status) }));
        return;
      }
      clearForm();
      router.push(`/law/amendments/${id}`);
    } catch {
      setError(t("failed", { reason: "network" }));
    } finally {
      setBusy(false);
    }
  }

  const headingOf = (path: string | null) =>
    props.contents.find((c) => c.path === path)?.heading ?? path ?? "";

  return (
    <div className="space-y-8">
      {props.forkOf && (
        <p className="rounded-surface border border-default bg-surface-base p-4 text-sm text-fg-secondary">
          {t("forkOf")}
        </p>
      )}

      {drafts.map((draft, i) => {
        const preview =
          draft.base &&
          (draft.op === "replace"
            ? redline(draft.base.text, draft.text)
            : draft.op === "repeal"
              ? redline(draft.base.text, "")
              : redline("", draft.text));
        return (
          <section
            key={draft.key}
            className="space-y-5 rounded-surface border border-default bg-surface-base p-5 sm:p-6"
            aria-label={t("changeLabel", { n: i + 1 })}
          >
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-semibold text-fg-primary">{t("changeLabel", { n: i + 1 })}</h2>
              {drafts.length > 1 && (
                <button
                  type="button"
                  onClick={() => setDrafts((all) => all.filter((d) => d.key !== draft.key))}
                  className="min-h-11 text-sm text-fg-secondary underline"
                >
                  {t("removeChange")}
                </button>
              )}
            </div>

            <div>
              <label
                className="block text-sm font-medium text-fg-primary"
                htmlFor={`a-${draft.key}`}
              >
                {t("chooseProvision")}
              </label>
              <select
                id={`a-${draft.key}`}
                className="field mt-2"
                value={draft.path ?? ""}
                onChange={(e) => e.target.value && choose(draft.key, e.target.value)}
              >
                <option value="">{t("pickOne")}</option>
                {props.contents.map((c) => (
                  <option key={c.path} value={c.path}>
                    {c.heading || c.path}
                  </option>
                ))}
              </select>
            </div>

            <fieldset>
              <legend className="text-sm font-medium text-fg-primary">{t("operation")}</legend>
              <div className="mt-2 grid grid-cols-3 gap-2" role="radiogroup">
                {(["replace", "repeal", "insert"] as const).map((op) => (
                  <label
                    key={op}
                    className={`flex min-h-11 cursor-pointer items-center justify-center rounded-control border px-2 text-center text-sm ${
                      draft.op === op
                        ? "border-accent text-fg-primary"
                        : "border-default text-fg-secondary"
                    }`}
                  >
                    <input
                      type="radio"
                      className="sr-only"
                      name={`op-${draft.key}`}
                      checked={draft.op === op}
                      onChange={() =>
                        update(draft.key, {
                          op,
                          heading: op === "insert" ? "" : (draft.base?.heading ?? ""),
                          text: op === "insert" ? "" : (draft.base?.text ?? ""),
                        })
                      }
                    />
                    {t(`ops.${op}`)}
                  </label>
                ))}
              </div>
            </fieldset>

            {loading[draft.key] && <p className="text-sm text-fg-tertiary">{t("loading")}</p>}
            {failed[draft.key] && <p className="text-sm text-fg-secondary">{t("loadFailed")}</p>}

            {draft.base && draft.op !== "insert" && (
              <div>
                <div className="kicker">{t("asPublished")}</div>
                <p className="mt-2 text-sm font-medium text-fg-primary">{draft.base.heading}</p>
                <p className="mt-1 whitespace-pre-line text-sm text-fg-secondary">
                  {draft.base.text}
                </p>
              </div>
            )}

            {draft.base && draft.op !== "repeal" && (
              <div className="space-y-3">
                <label
                  className="block text-sm font-medium text-fg-primary"
                  htmlFor={`h-${draft.key}`}
                >
                  {draft.op === "insert" ? t("newHeading") : t("yourWording")}
                </label>
                <input
                  id={`h-${draft.key}`}
                  className="field"
                  value={draft.heading}
                  onChange={(e) => update(draft.key, { heading: e.target.value })}
                />
                <TextBox
                  id={`t-${draft.key}`}
                  label={draft.op === "insert" ? t("newText") : undefined}
                  ariaLabel={draft.op === "insert" ? t("newText") : t("yourWording")}
                  rows={8}
                  value={draft.text}
                  onValueChange={(text) => update(draft.key, { text })}
                />
              </div>
            )}

            {preview && (
              <div>
                <div className="kicker">{t("redline")}</div>
                <div className="mt-2 rounded-control border border-subtle p-4">
                  <p className="mb-2 text-sm font-medium text-fg-primary">
                    {draft.op === "insert" ? draft.heading : headingOf(draft.path)}
                  </p>
                  <Redline parts={preview} />
                </div>
              </div>
            )}
          </section>
        );
      })}

      <button
        type="button"
        onClick={() => setDrafts((all) => [...all, emptyChange()])}
        className="btn-frame w-full sm:w-auto"
      >
        {t("addChange")}
      </button>

      <div className="space-y-5 rounded-surface border border-default bg-surface-base p-5 sm:p-6">
        <div>
          <label className="block text-sm font-medium text-fg-primary" htmlFor="am-title">
            {t("title")}
          </label>
          <input
            id="am-title"
            className="field mt-2"
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <p className="mt-1.5 text-xs text-fg-tertiary">{t("titleHint")}</p>
        </div>
        <div>
          <TextBox
            id="am-why"
            label={t("rationale")}
            rows={5}
            value={rationale}
            onValueChange={(text) => setRationale(() => text)}
            hint={t("rationaleHint")}
          />
        </div>
      </div>

      {props.routes}

      <p className="text-sm text-fg-tertiary">{t("notLaw")}</p>

      {error && (
        <div role="alert" className="space-y-1 text-sm text-fg-primary">
          <p>{error}</p>
          {problems.map((p) => (
            <p key={`${p.change}-${p.kind}`} className="text-fg-secondary">
              {t(`problems.${p.kind}`, {
                path: headingOf("path" in p ? p.path : "after" in p ? p.after : null),
              })}
            </p>
          ))}
        </div>
      )}

      {props.signedIn ? (
        <button
          type="button"
          disabled={!ready || busy}
          onClick={submit}
          className="btn-primary w-full sm:w-auto"
        >
          {busy ? t("submitting") : t("submit")}
        </button>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-fg-secondary">{t("signInFirst")}</p>
          <a
            href={props.signInHref}
            className="btn-primary inline-flex w-full justify-center sm:w-auto"
          >
            {t("signIn")}
          </a>
        </div>
      )}

      <section className="space-y-3 border-t border-default pt-8">
        <h2 className="headline text-xl text-fg-primary">{t("consult.title")}</h2>
        <p className="text-sm text-fg-secondary">{t("consult.intro")}</p>
        <LawChat
          proposal={proposal}
          title={t("consult.title")}
          placeholder={t("consult.placeholder")}
          startersTitle={t("consult.startersTitle")}
          storeKey={`solon-consult:${props.act.id}`}
          starters={[
            t("consult.starters.one"),
            t("consult.starters.two"),
            t("consult.starters.three"),
          ]}
        />
      </section>
    </div>
  );
}
