import type { ReactNode } from "react";
import PageLayout from "@/components/ui/page-layout";

/**
 * A place page's frame: under its photograph when it has one (the hero carries
 * the title), else the standard title block. One frame for every place, so a
 * place that gains a photograph changes nothing else on its page.
 */
export default function ProfileFrame({
  hero,
  title,
  kicker,
  description,
  children,
}: {
  hero: ReactNode | null;
  title: string;
  kicker?: string;
  description?: string;
  children: ReactNode;
}) {
  if (!hero) {
    return (
      <PageLayout title={title} kicker={kicker} description={description}>
        {children}
      </PageLayout>
    );
  }
  return (
    <>
      {hero}
      <main className="section-shell py-section-tight">{children}</main>
    </>
  );
}
