/**
 * RFC 4180 CSV to records keyed by the header row: quoted fields, doubled
 * quotes, commas and line breaks inside quotes, CRLF or LF, a leading BOM.
 * Official registers publish CSV; nothing here knows which.
 */
export function parseCsv(text: string): Record<string, string>[] {
  const rows = csvRows(text.replace(/^\uFEFF/, ""));
  const header = rows.shift();
  if (!header) {
    return [];
  }
  return rows
    .filter((row) => !(row.length === 1 && row[0] === ""))
    .map((row) => Object.fromEntries(header.map((name, i) => [name, row[i] ?? ""])));
}

function csvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i]!;
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") {
        i++;
      }
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** A register's `DD.MM.YYYY` as an ISO date; empty stays null. */
export function isoFromDottedDate(value: string): string | null {
  if (value === "") {
    return null;
  }
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value);
  if (!match) {
    throw new Error(`"${value}" is not a DD.MM.YYYY date`);
  }
  return `${match[3]}-${match[2]}-${match[1]}`;
}
