/** A few labelled figures in one row of tiles: one shape for every key number on a budget page. */
export default function FigureTiles({ figures }: { figures: readonly [string, string][] }) {
  return (
    <dl className="grid grid-cols-[minmax(0,1fr)] gap-3 text-sm sm:grid-cols-2">
      {figures.map(([label, value]) => (
        <div
          key={label}
          className="flex items-baseline justify-between gap-3 rounded-surface border border-default px-4 py-3"
        >
          <dt className="text-fg-secondary">{label}</dt>
          <dd className="mb-0 font-semibold text-fg-primary">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
