import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";

/**
 * Progressive disclosure, the second of three depths (docs/design/
 * 2026-09-solon-plan.md §2): the plain page stays short, and the mechanism is
 * one tap away — folded, on the same page. `technical` points on to the third
 * depth, the exact reference, for readers who want the weeds.
 */
export default function Deeper({
  label,
  children,
  technical,
}: {
  /** The fold's own label, e.g. "How this works". */
  label: string;
  children: ReactNode;
  technical?: { href: string; label: string };
}) {
  return (
    <details className="group border-y border-subtle py-5">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-fg-primary">
        <span>{label}</span>
        <span
          aria-hidden="true"
          className="text-lg leading-none text-fg-secondary transition-transform group-open:rotate-45"
        >
          +
        </span>
      </summary>
      <div className="mt-4 max-w-copy space-y-4 text-fg-secondary">{children}</div>
      {technical && (
        <Link
          href={technical.href}
          className="mt-5 inline-block font-mono text-xs uppercase tracking-caps text-fg-primary underline underline-offset-4"
        >
          {technical.label}
        </Link>
      )}
    </details>
  );
}
