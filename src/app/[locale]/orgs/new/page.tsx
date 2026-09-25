import { Link } from "@/i18n/navigation";
import PageLayout from "@/components/ui/page-layout";
import CreateOrganization from "@/components/governance/create-organization";
import { auth, signIn, authEnabled } from "@/lib/auth";
import { verifyLokiGrant, type LokiGrant } from "@/lib/loki-grant";

export const metadata = { title: "Found an organization — Solon" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const one = (v: string | string[] | undefined): string => (Array.isArray(v) ? v[0] : v) ?? "";

/**
 * Found an organization.
 *
 * Reachable directly, and from a Loki project page, which links here with the
 * fields pre-filled and a grant attached (`project`, `exp`, `grant`). The grant
 * is checked here only to TELL the founder, before they sign, whether the
 * organization will be recorded as governing that project; the API re-checks
 * it on submit and is the only check that counts.
 */
export default async function NewOrganizationPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const q = await searchParams;
  const prefill = { slug: one(q.slug), name: one(q.name), description: one(q.description) };
  const project = one(q.project);
  const sig = one(q.grant);
  const exp = Number(one(q.exp));
  const grant: LokiGrant | null = project && sig && exp ? { project, exp, sig } : null;

  // The whole query must survive the sign-in round trip, or a link from Loki
  // arrives back here without the grant it came with.
  const query = new URLSearchParams(
    Object.entries(q).flatMap(([k, v]) =>
      v === undefined ? [] : (Array.isArray(v) ? v : [v]).map((x) => [k, x] as [string, string]),
    ),
  ).toString();
  const here = query ? `/orgs/new?${query}` : "/orgs/new";

  const description =
    "Anyone with an OrangeCat identity may found one. You take the founding seat in the same step; everything after — admitting members, spending, changing the rules — is decided by vote.";

  if (!authEnabled) {
    return (
      <PageLayout title="Found an organization" description={description}>
        <p className="text-center text-sm text-fg-secondary">
          Sign-in is not configured in this environment.
        </p>
      </PageLayout>
    );
  }

  const session = await auth();
  if (!session?.actorId) {
    return (
      <PageLayout title="Found an organization" description={description}>
        <div className="mx-auto max-w-2xl rounded-surface border border-default bg-surface-base p-6">
          <p className="text-sm leading-relaxed text-fg-secondary">
            The roster says who you are through OrangeCat, and your votes verify through a Bitcoin
            key. Start with the first.
          </p>
          <form
            className="mt-6"
            action={async () => {
              "use server";
              await signIn("orangecat", { redirectTo: here });
            }}
          >
            <button type="submit" className="btn-primary">
              Sign in with OrangeCat
            </button>
          </form>
        </div>
      </PageLayout>
    );
  }

  const verdict = grant
    ? verifyLokiGrant(grant, session.actorId, { secret: process.env.SOLON_WEBHOOK_SECRET })
    : null;

  // A link from Loki that no longer verifies is not silently downgraded to an
  // unattributed founding — the founder is told, and choosing to found without
  // the link is a separate, explicit step.
  if (verdict && !verdict.valid) {
    const withoutGrant = new URLSearchParams(
      Object.entries(prefill).filter(([, v]) => v) as [string, string][],
    ).toString();
    return (
      <PageLayout title="Found an organization" description={description}>
        <div className="mx-auto max-w-2xl space-y-4 rounded-surface border border-default bg-surface-base p-6">
          <p className="rounded-control border border-status-negative/40 bg-surface-raised p-3 text-sm text-fg-primary">
            {verdict.reason}
          </p>
          <Link
            href={withoutGrant ? `/orgs/new?${withoutGrant}` : "/orgs/new"}
            className="block text-sm text-fg-secondary transition-colors hover:text-fg-primary"
          >
            Found it without linking it to a project →
          </Link>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Found an organization" description={description}>
      <div className="mx-auto max-w-2xl space-y-6">
        {verdict?.valid && (
          <p className="rounded-surface border border-default bg-surface-raised p-4 text-sm leading-relaxed text-fg-secondary">
            Loki confirmed you own the project{" "}
            <span className="font-mono text-fg-primary">{verdict.project}</span>. The organization
            will be recorded as governing it, and the text you sign says so.
          </p>
        )}
        <CreateOrganization
          actorId={session.actorId}
          defaultFounderName={session.user?.name ?? "Founder"}
          prefill={prefill}
          grant={verdict?.valid ? grant : null}
        />
      </div>
    </PageLayout>
  );
}
