import { CYCLE_OPTIONS, cyclePairs, labelFor } from "@/lib/governance/worked-example";

/**
 * Condorcet's paradox as a picture: three head-to-head races, each won two to
 * one, arranged in a circle that never terminates.
 *
 * The arrows are DERIVED from the same ballots the page tallies — draw them by
 * hand and the diagram becomes a claim nobody checks. Read it by following any
 * arrow: whatever you land on, something beats it.
 */

const NODES: Record<string, { x: number; y: number }> = {
  hall: { x: 200, y: 62 },
  yard: { x: 326, y: 258 },
  kitchen: { x: 74, y: 258 },
};

const R = 52;

export function CycleDiagram() {
  const pairs = cyclePairs();

  return (
    <svg
      viewBox="0 0 400 330"
      className="mx-auto h-auto w-full max-w-copy"
      role="img"
      aria-label="Three options in a circle: the hall beats the yard two to one, the yard beats the kitchen two to one, and the kitchen beats the hall two to one."
    >
      <defs>
        <marker
          id="cycle-arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" className="fill-accent" />
        </marker>
      </defs>

      {pairs.map((p) => {
        const a = NODES[p.winner];
        const b = NODES[p.loser];
        if (!a || !b) return null;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len;
        const uy = dy / len;
        // Trim both ends so the line meets the circles, not their centres.
        const x1 = a.x + ux * (R + 6);
        const y1 = a.y + uy * (R + 6);
        const x2 = b.x - ux * (R + 12);
        const y2 = b.y - uy * (R + 12);
        // Push the score off the line, away from the triangle's middle.
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        const ox = mx - 200;
        const oy = my - 195;
        const olen = Math.hypot(ox, oy) || 1;

        return (
          <g key={`${p.winner}-${p.loser}`}>
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              className="stroke-accent"
              strokeWidth="2"
              markerEnd="url(#cycle-arrow)"
            />
            <text
              x={mx + (ox / olen) * 26}
              y={my + (oy / olen) * 26}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-fg-secondary font-mono text-xs"
              fontSize="13"
            >
              {p.for}–{p.against}
            </text>
          </g>
        );
      })}

      {CYCLE_OPTIONS.map((o) => {
        const n = NODES[o.key];
        if (!n) return null;
        return (
          <g key={o.key}>
            <circle
              cx={n.x}
              cy={n.y}
              r={R}
              className="fill-surface-raised stroke-border-strong"
              strokeWidth="1.5"
            />
            <text
              x={n.x}
              y={n.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-fg-primary"
              fontSize="14"
            >
              {labelFor(CYCLE_OPTIONS, o.key)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
