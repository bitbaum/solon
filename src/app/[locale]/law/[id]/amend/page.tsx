import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { toLocale } from "@/i18n/routing";
import PageLayout from "@/components/ui/page-layout";
import AmendForm, { type DraftChange } from "@/components/law/amend-form";
import { auth } from "@/lib/auth";
import { entryHref } from "@/lib/auth/entry-href";
import { db } from "@/lib/db/client";
import { loadRevision, provisionsInForce } from "@/lib/law/amend/store";
import { loadActContents, loadActView } from "@/lib/law/view";

export const dynamic = "force-dynamic";

type Params = Promise<{ locale: string; id: string }>;
type SearchParams = Promise<{ at?: string; fork?: string }>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ANCHOR = /^[A-Za-z0-9_.-]{1,80}$/;

export async function generateMetadata({ params }: { params: Params }) {
  const t = await getTranslations({ locale: toLocale((await params).locale), namespace: "Amend" });
  return { title: t("metaTitle"), robots: { index: false } };
}

/**
 * Propose a change to an act (design: docs/design/2026-11-amending-the-law.md).
 * `?at=` opens on the article the reader came from; `?fork=` starts from
 * another proposal's revision, re-pinned to the text in force now.
 */
export default async function AmendPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { locale: raw, id } = await params;
  const locale = toLocale(raw);
  setRequestLocale(locale);
  if (!UUID.test(id)) notFound();
  const query = await searchParams;
  const act = await loadActView(db, { id, lang: "de", page: 1 });
  if (!act?.version) notFound();
  const lang = act.version.lang;
  const contents = await loadActContents(db, { id, lang });
  const t = await getTranslations({ locale, namespace: "Amend" });

  let initial: DraftChange[] = [];
  let fork: Awaited<ReturnType<typeof loadRevision>> = null;
  if (query.fork && UUID.test(query.fork)) {
    fork = await loadRevision(db, query.fork);
    if (fork && fork.actId === id) {
      // The alternative starts from the other proposal's words, pinned to the text in force now.
      const now = new Map((await provisionsInForce(db, id, lang)).map((p) => [p.path, p]));
      initial = fork.changes.flatMap((c, i): DraftChange[] => {
        const path = c.op === "insert" ? c.after : c.path;
        const base = path ? now.get(path) : undefined;
        if (!path || !base) return [];
        return [
          {
            key: `fork-${i}`,
            op: c.op,
            path,
            base,
            heading:
              c.op === "insert"
                ? c.heading
                : c.op === "replace"
                  ? (c.heading ?? base.heading)
                  : base.heading,
            text: c.op === "repeal" ? base.text : c.text,
          },
        ];
      });
    } else {
      fork = null;
    }
  } else if (query.at && ANCHOR.test(query.at)) {
    const base = (await provisionsInForce(db, id, lang)).find((p) => p.path === query.at);
    if (base) {
      initial = [
        { key: "at", op: "replace", path: base.path, base, heading: base.heading, text: base.text },
      ];
    }
  }

  const here = `/law/${id}/amend${query.at ? `?at=${encodeURIComponent(query.at)}` : query.fork ? `?fork=${query.fork}` : ""}`;
  const session = await auth().catch(() => null);
  return (
    <PageLayout
      title={act.title ?? act.systematicNumber ?? act.id}
      kicker={t("kicker")}
      description={t("intro")}
    >
      <div className="max-w-3xl">
        <AmendForm
          act={{ id, title: act.title ?? id, lang }}
          contents={contents}
          initial={initial}
          initialTitle={fork?.title}
          initialRationale={fork?.rationale}
          forkOf={fork?.id}
          signedIn={Boolean(session)}
          signInHref={entryHref("sign-in", locale, here)}
        />
      </div>
    </PageLayout>
  );
}
