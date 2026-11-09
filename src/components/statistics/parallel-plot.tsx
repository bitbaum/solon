import type { ParallelColumn, ParallelLine } from "@/lib/statistics/compare";

interface ParallelPlotProps {
  columns: (ParallelColumn & { label: string; fmt: (v: number) => string })[];
  lines: ParallelLine[];
  caption: string;
  /** Table headings and the words for "no value". */
  texts: { place: string; none: string };
}

/**
 * Parallel coordinates: one line per place across an axis's measures, each
 * measure scaled between its own lowest and highest value among the places.
 * A gap in a line is a measure the place has no value for. The same numbers
 * are a table beneath; colour is never the only mark, since each line ends in
 * its place's name.
 */
export default function ParallelPlot({ columns, lines, caption, texts }: ParallelPlotProps) {
  const n = columns.length;
  const x = (i: number) => ((i + 0.5) / n) * 100;
  return (
    <figure className="ck-chart space-y-3">
      <div className="grid pb-6" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
        {columns.map((c) => (
          <p key={c.metric} className="mb-0 px-1 text-center text-xs text-fg-secondary">
            {c.label}
          </p>
        ))}
      </div>
      <div className="relative mb-6 h-64">
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {columns.map((c, i) => (
            <line
              key={c.metric}
              x1={x(i)}
              x2={x(i)}
              y1={0}
              y2={100}
              stroke="var(--ck-line)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {lines.map((l, k) => {
            const segments: string[] = [];
            let run: string[] = [];
            l.at.forEach((v, i) => {
              if (v === null) {
                if (run.length > 1) segments.push(run.join(" "));
                run = [];
              } else {
                run.push(`${x(i)},${100 - v * 100}`);
              }
            });
            if (run.length > 1) segments.push(run.join(" "));
            return segments.map((points) => (
              <polyline
                key={`${l.code}-${points}`}
                points={points}
                fill="none"
                stroke={`var(--ck-series-${(k % 6) + 1})`}
                strokeWidth={2}
                strokeDasharray={k === 0 ? undefined : `${k * 2 + 2} 3`}
                vectorEffect="non-scaling-stroke"
              />
            ));
          })}
        </svg>
        {lines.map((l, k) =>
          l.at.map((v, i) =>
            v === null ? null : (
              <span
                key={`${l.code}-${i}`}
                className="absolute block h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-pill border border-default"
                style={{
                  left: `${x(i)}%`,
                  top: `${100 - v * 100}%`,
                  background: `var(--ck-series-${(k % 6) + 1})`,
                }}
                title={`${l.name}: ${columns[i]!.fmt(l.values[i]!)}`}
              />
            ),
          ),
        )}
        {columns.map((c, i) => (
          <span key={`hi${c.metric}`}>
            <span
              className="absolute -translate-x-1/2 text-xs text-fg-tertiary tabular-nums"
              style={{ left: `${x(i)}%`, top: "-1.1rem" }}
            >
              {c.fmt(c.max)}
            </span>
            <span
              className="absolute -translate-x-1/2 text-xs text-fg-tertiary tabular-nums"
              style={{ left: `${x(i)}%`, bottom: "-1.1rem" }}
            >
              {c.fmt(c.min)}
            </span>
          </span>
        ))}
      </div>
      <ul className="mb-0 mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-fg-primary">
        {lines.map((l, k) => (
          <li key={l.code} className="flex items-center gap-2">
            <span
              aria-hidden
              className="h-3 w-3 rounded-pill border border-default"
              style={{ background: `var(--ck-series-${(k % 6) + 1})` }}
            />
            {l.name}
          </li>
        ))}
      </ul>
      <figcaption className="text-sm text-fg-tertiary">{caption}</figcaption>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-fg-tertiary">
              <th className="py-1 pr-4 font-normal">{texts.place}</th>
              {columns.map((c) => (
                <th key={c.metric} className="py-1 pr-4 text-right font-normal">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.code} className="border-t border-subtle">
                <th scope="row" className="py-1 pr-4 text-left font-normal text-fg-primary">
                  {l.name}
                </th>
                {l.values.map((v, i) => (
                  <td key={columns[i]!.metric} className="py-1 pr-4 text-right tabular-nums">
                    {v === null ? texts.none : columns[i]!.fmt(v)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
