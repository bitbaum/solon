/** The publisher's words around a match, the match marked (the search wraps it in `[[` and `]]`). */
export default function Excerpt({ text }: { text: string }) {
  const parts = text.split(/\[\[|\]\]/);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="bg-transparent font-semibold text-fg-primary underline">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}
