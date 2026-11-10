/**
 * The number a document prints for itself. A commune's regulation carries its file number on the front page
 * ("Akte Nr.: 01.01.03"); the address it was downloaded from carries only an id. Only the head of the text is
 * read: a number quoted further down (a reference to another act) is not this act's.
 */
const HEAD = 3_000;

export function numberPrintedIn(text: string, pattern: RegExp): string | null {
  const found = pattern.exec(text.slice(0, HEAD))?.[1];
  const number = found
    ?.replace(/\s+/g, " ")
    .replace(/[.,;:]+$/, "")
    .trim();
  return number ? number : null;
}
