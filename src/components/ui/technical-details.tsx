/**
 * The way down from a plain page to the exact record: closed by default, one
 * click to open. Everyday pages say what happened in plain words; identifiers,
 * addresses, raw payloads and API links live in here, so the reader who wants
 * them never has to leave the page and the reader who does not never sees them.
 */
export default function TechnicalDetails({
  children,
  summary = "Technical details",
  className = "",
}: {
  children: React.ReactNode;
  summary?: string;
  className?: string;
}) {
  return (
    <details className={`text-xs ${className}`}>
      <summary className="cursor-pointer text-fg-tertiary transition-colors hover:text-fg-secondary">
        {summary}
      </summary>
      <div className="mt-2 space-y-2 text-fg-secondary">{children}</div>
    </details>
  );
}
