import { PHOTOS } from "@/lib/content/photos";

export const metadata = {
  title: "Photo credits — Solon",
  description: "Who made the photographs on this site, and under what licence.",
};

/** Every photograph on the site, rendered from the same list the pages use. */
export default function CreditsPage() {
  const photos = Object.values(PHOTOS);
  return (
    <main className="section-shell py-section-tight">
      <div className="kicker">Photo credits</div>
      <h1 className="headline mt-5 text-4xl sm:text-5xl">The photographs on this site</h1>
      <p className="mt-5 max-w-copy text-fg-secondary">
        All are from Wikimedia Commons, used under the licences below. None shows a Solon customer
        or implies one.
      </p>
      <ul className="mt-12 divide-y divide-subtle border-y border-subtle">
        {photos.map((p) => (
          <li key={p.source} className="grid gap-2 py-6 sm:grid-cols-3 sm:gap-6">
            <a
              href={p.source}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-fg-primary underline underline-offset-4"
            >
              {p.title}
            </a>
            <div className="text-fg-secondary">{p.author}</div>
            <div className="text-fg-secondary">
              {p.licenseUrl ? (
                <a
                  href={p.licenseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-4"
                >
                  {p.license}
                </a>
              ) : (
                p.license
              )}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
