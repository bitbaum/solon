import { unzipSync } from "fflate";

/**
 * RFC 4180 CSV to records keyed by the header row: quoted fields, doubled
 * quotes, delimiters and line breaks inside quotes, CRLF or LF, a leading BOM.
 * Official registers publish CSV; nothing here knows which.
 */
export function parseCsv(text: string, delimiter = ","): Record<string, string>[] {
  const rows = csvRows(text.replace(/^\uFEFF/, ""), delimiter);
  const header = rows.shift();
  if (!header) {
    return [];
  }
  return rows
    .filter((row) => !(row.length === 1 && row[0] === ""))
    .map((row) => Object.fromEntries(header.map((name, i) => [name, row[i] ?? ""])));
}

/** An adapter's `decode` for CSV sources, UTF-8. */
export const decodeCsv = (bytes: Uint8Array): unknown => parseCsv(new TextDecoder().decode(bytes));

const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04];

/**
 * An adapter's `decode` for CSV that may come zipped (the archive must hold
 * exactly one `.csv`) and separated by semicolons, as European registers often
 * publish it: the header row decides the delimiter.
 */
export function decodeCsvAnyForm(bytes: Uint8Array): unknown {
  let csv = bytes;
  if (ZIP_MAGIC.every((byte, i) => bytes[i] === byte)) {
    const entries = Object.entries(unzipSync(bytes)).filter(([name]) =>
      name.toLowerCase().endsWith(".csv"),
    );
    if (entries.length !== 1) {
      throw new Error(`the archive holds ${entries.length} CSV files, not one`);
    }
    csv = entries[0]![1];
  }
  const text = new TextDecoder().decode(csv);
  const end = text.search(/\r?\n/);
  const header = end === -1 ? text : text.slice(0, end);
  const delimiter = header.split(";").length > header.split(",").length ? ";" : ",";
  return parseCsv(text, delimiter);
}

function csvRows(text: string, delimiter: string): string[][] {
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
    } else if (char === delimiter) {
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
