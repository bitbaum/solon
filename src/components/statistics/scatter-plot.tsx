import { valueScale } from "@bitbaum/chartkit";
import { Link } from "@/i18n/navigation";
import type { ScatterPoint } from "@/lib/statistics/compare";

interface ScatterPlotProps {
  points: ScatterPoint[];
  xLabel: string;
  yLabel: string;
  /** Formats a value as the reader sees it. */
  fx: (value: number) => string;
  fy: (value: number) => string;
  /** A page for a place's point, without the locale. */
  hrefOf: (point: ScatterPoint) => string;
  caption: string;
  /** Table headings. */
  columns: { place: string; year: string };
}

const pct = (v: number, min: number, max: number) =>
  max === min ? 50 : ((v - min) / (max - min)) * 100;

/**
 * Two measures against each other, one point per place. Server-drawn like
 * chartkit's charts: the plot is HTML laid out in per cent, so its type is
 * the page's and never shrinks; colours come from the chart tokens; every
 * point is a link, and the same numbers are a table beneath.
 */
export default function ScatterPlot({
  points,
  xLabel,
  yLabel,
  fx,
  fy,
  hrefOf,
  caption,
  columns,
}: ScatterPlotProps) {
  const sx = valueScale(
    points.map((p) => p.x),
    "data",
  );
  const sy = valueScale(
    points.map((p) => p.y),
    "data",
  );
  return (
    <figure className="ck-chart space-y-3">
      <div className="grid grid-cols-[auto_1fr] gap-x-3">
        <p className="mb-0 self-center text-sm text-fg-secondary [writing-mode:vertical-rl] rotate-180">
          {yLabel}
        </p>
        <div className="space-y-2">
          <div className="relative ml-12 h-72 border-b border-l border-default">
            {sy.ticks.map((t) => (
              <span
                key={`y${t}`}
                className="absolute left-0 w-full border-t border-subtle"
                style={{ top: `${100 - pct(t, sy.min, sy.max)}%` }}
              >
                <span className="absolute -left-12 w-10 -translate-y-1/2 text-right text-xs text-fg-tertiary tabular-nums">
                  {fy(t)}
                </span>
              </span>
            ))}
            {sx.ticks.map((t) => (
              <span
                key={`x${t}`}
                className="absolute top-full -translate-x-1/2 pt-1 text-xs text-fg-tertiary tabular-nums"
                style={{ left: `${pct(t, sx.min, sx.max)}%` }}
              >
                {fx(t)}
              </span>
            ))}
            {points.map((p, i) => {
              const left = pct(p.x, sx.min, sx.max);
              return (
                <Link
                  key={p.code}
                  href={hrefOf(p)}
                  className="absolute flex min-h-11 min-w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
                  style={{ left: `${left}%`, top: `${100 - pct(p.y, sy.min, sy.max)}%` }}
                  title={`${p.name}: ${fx(p.x)} · ${fy(p.y)} (${p.year})`}
                >
                  <span
                    className="block h-3.5 w-3.5 rounded-pill border border-default"
                    style={{ background: `var(--ck-series-${(i % 6) + 1})` }}
                  />
                  <span
                    className={`absolute top-1/2 -translate-y-1/2 whitespace-nowrap text-sm text-fg-primary ${left > 70 ? "right-full pr-1" : "left-full pl-1"}`}
                  >
                    {p.name}
                  </span>
                </Link>
              );
            })}
          </div>
          <p className="mb-0 ml-12 pt-5 text-center text-sm text-fg-secondary">{xLabel}</p>
        </div>
      </div>
      <figcaption className="text-sm text-fg-tertiary">{caption}</figcaption>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-fg-tertiary">
              <th className="py-1 pr-4 font-normal">{columns.place}</th>
              <th className="py-1 pr-4 text-right font-normal">{xLabel}</th>
              <th className="py-1 pr-4 text-right font-normal">{yLabel}</th>
              <th className="py-1 text-right font-normal">{columns.year}</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.code} className="border-t border-subtle">
                <th scope="row" className="py-1 pr-4 text-left font-normal text-fg-primary">
                  {p.name}
                </th>
                <td className="py-1 pr-4 text-right tabular-nums">{fx(p.x)}</td>
                <td className="py-1 pr-4 text-right tabular-nums">{fy(p.y)}</td>
                <td className="py-1 text-right tabular-nums text-fg-tertiary">{p.year}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
