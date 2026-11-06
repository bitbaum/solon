import type { RedlinePart } from "@/lib/law/amend/changes";

/**
 * A redline: struck words and added words in the run of the text. Colour is
 * never the only signal — struck text is struck through and added text
 * underlined, and each carries its role for a screen reader.
 */
export default function Redline({ parts }: { parts: readonly RedlinePart[] }) {
  return (
    <p className="whitespace-pre-line leading-relaxed text-fg-primary">
      {parts.map((part, i) =>
        part.kind === "removed" ? (
          <del key={i} className="text-fg-tertiary line-through decoration-2">
            {part.text}
          </del>
        ) : part.kind === "added" ? (
          <ins key={i} className="text-accent underline decoration-2 underline-offset-4">
            {part.text}
          </ins>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </p>
  );
}
