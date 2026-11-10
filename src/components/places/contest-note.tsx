import { Link } from "@/i18n/navigation";
import type { PlacesTranslator } from "./translator";

export interface ContestNoteProps {
  /** The UN member that regards the place as part of its territory. */
  claimant: { name: string; href: string };
  /** The place's comparison, question by question. */
  href: string;
}

/**
 * What every page of a claimed place says, in the same words and the same
 * place: who claims it, and the way to compare the two sets of law. Shared by
 * the world page and every page of a pack the world list marks as claimed.
 */
export default function ContestNote({
  claimant,
  href,
  statusShown = false,
  t,
}: ContestNoteProps & {
  /** The page's hero already says the place governs itself: only the claim is left to say. */
  statusShown?: boolean;
  t: PlacesTranslator;
}) {
  return (
    <div className="space-y-2 rounded-surface border border-default bg-surface-base p-5 sm:p-6">
      <p className="mb-0 text-sm text-fg-secondary">
        {t.rich(statusShown ? "world.claimedBy" : "world.claimed", {
          claimant: claimant.name,
          link: (chunks) => (
            <Link href={claimant.href} className="text-fg-primary hover:underline">
              {chunks}
            </Link>
          ),
        })}
      </p>
      <Link
        href={href}
        className="inline-block text-sm font-semibold text-fg-primary hover:underline"
      >
        {t("contested.compare", { claimant: claimant.name })} →
      </Link>
    </div>
  );
}
