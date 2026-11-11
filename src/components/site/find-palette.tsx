"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { FindEntry } from "@/lib/site/find-index";
import { SITE_LINKS } from "@/lib/site-config";
import { placeHref } from "@/lib/places/place-href";

interface Result {
  id: string;
  group: string;
  title: string;
  description: string;
  href: string;
}

/** Lower case, accents folded: "zurich" finds "Zürich". */
const fold = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase();

/** 3 for a title that starts with the query, 2 for one that holds it, 1 for a description that does. */
function score(title: string, description: string, q: string): number {
  const t = fold(title);
  if (t.startsWith(q)) return 3;
  if (t.includes(q)) return 2;
  return fold(description).includes(q) ? 1 : 0;
}

/**
 * Find: one box in front of everything Solon holds. It opens with a button, with
 * Ctrl or Cmd + K, or with "/" outside a field; type a few letters and pages,
 * statistics, places and laws that match are listed, the pages and statistics
 * at once, places and laws as the live search answers. Arrow keys move,
 * Enter opens, Escape closes. The pages come from the site map and the
 * statistics from the server (find-index.ts), so nothing is listed twice by hand.
 */
export default function FindPalette({
  entries,
  children,
}: {
  entries: readonly FindEntry[];
  /** The button's contents; the palette gives it its label and its key hint. */
  children?: React.ReactNode;
}) {
  const t = useTranslations("Find");
  const site = useTranslations("Site");
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [live, setLive] = useState<Result[]>([]);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const opener = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement | null)?.closest(
        "input, textarea, select, [contenteditable]",
      );
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) input.current?.focus();
    else opener.current?.focus({ preventScroll: true });
  }, [open]);

  const needle = fold(q.trim());

  // Places and acts, as the live search answers; a short pause after the last key.
  useEffect(() => {
    if (needle.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const [places, acts] = await Promise.all([
        fetch(`/api/v1/places?${new URLSearchParams({ q: q.trim(), locale })}`, {
          signal: controller.signal,
        })
          .then((r) => (r.ok ? r.json() : { places: [] }))
          .catch(() => ({ places: [] })),
        fetch(`/api/v1/law/acts?${new URLSearchParams({ title: q.trim(), inForce: "1" })}`, {
          signal: controller.signal,
        })
          .then((r) => (r.ok ? r.json() : { acts: [] }))
          .catch(() => ({ acts: [] })),
      ]);
      if (controller.signal.aborted) return;
      setLive([
        ...(
          places.places as {
            slugPath: string;
            canonicalPath: string;
            name: string;
            levelName: string;
            parentName: string | null;
          }[]
        )
          .slice(0, 6)
          .map((p) => ({
            id: `place:${p.slugPath}`,
            group: "places",
            title: p.name,
            description: [p.levelName, p.parentName].filter(Boolean).join(" · "),
            href: placeHref(p.canonicalPath),
          })),
        ...(acts.acts as { id: string; title: string | null; systematicNumber: string | null }[])
          .slice(0, 6)
          .map((a) => ({
            id: `act:${a.id}`,
            group: "law",
            title: a.title ?? a.systematicNumber ?? a.id,
            description: a.systematicNumber ?? "",
            href: `/law/${a.id}`,
          })),
      ]);
    }, 220);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [needle, q, locale]);

  const pages = useMemo<Result[]>(
    () =>
      SITE_LINKS.map((l) => ({
        id: `page:${l.href}`,
        group: "pages",
        title: site(`links.${l.key}`),
        description: site(`desc.${l.key}` as never),
        href: l.href,
      })),
    [site],
  );
  const data = useMemo<Result[]>(
    () =>
      entries.map((e) => ({
        id: `${e.group}:${e.href}`,
        group: e.group,
        title: e.title,
        description: e.description,
        href: e.href,
      })),
    [entries],
  );

  const results = useMemo<Result[]>(() => {
    if (!needle) return pages.slice(0, 8);
    const local = [...pages, ...data]
      .map((r) => ({ r, s: score(r.title, r.description, needle) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 12)
      .map((x) => x.r);
    return [...local, ...(needle.length >= 2 ? live : [])];
  }, [needle, pages, data, live]);

  const go = (r: Result) => {
    setOpen(false);
    setQ("");
    router.push(r.href);
  };

  const groups = [...new Set(results.map((r) => r.group))];
  return (
    <>
      <button
        ref={opener}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-keyshortcuts="Control+K Meta+K /"
        className="inline-flex min-h-11 items-center gap-2 rounded-control border border-default px-3 text-sm text-fg-secondary hover:text-fg-primary"
      >
        {children ?? t("button")}
        <kbd className="hidden rounded border border-default px-1.5 text-xs text-fg-tertiary lg:inline">
          /
        </kbd>
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 p-4 pt-[10vh]"
          onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("title")}
            className="w-full max-w-2xl overflow-hidden rounded-surface border border-default bg-surface-overlay"
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
              else if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter" && results[active]) {
                e.preventDefault();
                go(results[active]!);
              }
            }}
          >
            <input
              ref={input}
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setActive(0);
              }}
              role="combobox"
              aria-expanded="true"
              aria-controls="find-results"
              aria-activedescendant={results[active] ? `find-${active}` : undefined}
              placeholder={t("placeholder")}
              className="w-full border-b border-default bg-transparent px-5 py-4 text-lg text-fg-primary outline-none"
            />
            <ul id="find-results" role="listbox" className="max-h-[60vh] overflow-y-auto p-2">
              {results.length === 0 && (
                <li className="px-3 py-6 text-center text-fg-secondary">{t("none")}</li>
              )}
              {groups.map((g) => (
                <li key={g} role="presentation">
                  <div className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wider text-fg-tertiary">
                    {t(`groups.${g}` as never)}
                  </div>
                  <ul role="presentation">
                    {results.map((r, i) =>
                      r.group === g ? (
                        <li
                          key={r.id}
                          id={`find-${i}`}
                          role="option"
                          aria-selected={i === active}
                          onMouseEnter={() => setActive(i)}
                          onClick={() => go(r)}
                          className={`flex min-h-11 cursor-pointer flex-col justify-center rounded-control px-3 py-2 ${i === active ? "bg-surface-raised" : ""}`}
                        >
                          <span className="font-medium text-fg-primary">{r.title}</span>
                          {r.description && (
                            <span className="truncate text-sm text-fg-secondary">
                              {r.description}
                            </span>
                          )}
                        </li>
                      ) : null,
                    )}
                  </ul>
                </li>
              ))}
            </ul>
            <p className="mb-0 border-t border-default px-5 py-2 text-xs text-fg-tertiary">
              {t("hint")}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
