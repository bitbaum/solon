/**
 * For a place asked for that has no figures in a series: each publisher Solon looked at, what it holds for
 * that place and the address it was read at, with the day, so "no figure" can be told from "not loaded yet".
 * Plain strings in: the page that owns the translator and the language builds them.
 */
export interface SearchRecordView {
  title: string;
  intro: string;
  openLabel: string;
  rows: { publisher: string; result: string; note: string; url: string }[];
}

export default function SearchRecord({ view }: { view: SearchRecordView }) {
  return (
    <section className="space-y-3 rounded-surface border border-default bg-surface-base p-6">
      <h2 className="text-xl font-semibold text-fg-primary">{view.title}</h2>
      <p className="mb-0 text-sm text-fg-secondary">{view.intro}</p>
      <ul className="divide-y divide-subtle">
        {view.rows.map((row) => (
          <li key={row.publisher} className="py-3">
            <div className="font-semibold text-fg-primary">{row.publisher}</div>
            <div className="text-sm text-fg-secondary">
              {row.result} {row.note}{" "}
              <a href={row.url} className="underline" rel="noopener">
                {view.openLabel}
              </a>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
