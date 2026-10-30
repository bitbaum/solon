import type { ReactNode } from "react";

/**
 * One row of the comparison. On a phone the label takes a line of its own
 * above the values, so every column gets the width instead of scrolling under
 * a pinned label; from `sm` up the label is the pinned first column. Each row
 * is its own row group, so the phone's label still heads its values.
 */
export default function ComparisonRow({
  label,
  labelClassName,
  columnCount,
  children,
}: {
  label: ReactNode;
  /** The label's colour and weight. */
  labelClassName: string;
  columnCount: number;
  children: ReactNode;
}) {
  return (
    <tbody className="border-b border-default last:border-b-0">
      <tr className="sm:hidden">
        <th
          scope="rowgroup"
          colSpan={columnCount + 1}
          className={`px-2 pt-3 text-left text-xs font-normal ${labelClassName}`}
        >
          {label}
        </th>
      </tr>
      <tr>
        <th
          scope="row"
          className={`sticky left-0 z-10 hidden bg-surface-base px-4 py-3 text-left align-top font-normal sm:table-cell ${labelClassName}`}
        >
          {label}
        </th>
        {children}
      </tr>
    </tbody>
  );
}

/** A value cell: tighter on a phone, where the columns share the screen. */
export const comparisonCell = "px-2 pb-3 pt-1 align-top sm:px-4 sm:py-3";
