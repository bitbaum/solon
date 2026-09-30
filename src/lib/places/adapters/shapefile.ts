/**
 * The Shapefile format (ESRI, 1998): polygon shapes from a `.shp`, their
 * attributes from the dBase `.dbf` beside it, both read synchronously from
 * bytes. Only what boundaries need: polygon records (plain, Z or M, whose
 * extra values are skipped) and attributes as trimmed strings.
 *
 * Boundaries are surveyed to the metre, far finer than a map needs, so points
 * can be snapped to a grid as they are read: repeats are dropped and rings
 * that collapse are left out, which keeps a country's file small in memory.
 */
import type { Position } from "geojson";

/** One record: its polygons (outer ring, then holes) in the file's own coordinates. */
export interface ShapeRecord {
  polygons: Position[][][];
  attributes: Record<string, string>;
}

const POLYGON_TYPES = new Set([5, 15, 25]);

/** The format draws outer rings clockwise and holes counter-clockwise (y up). */
function clockwise(ring: Position[]): boolean {
  let sum = 0;
  for (let i = 1; i < ring.length; i++) {
    const [x1, y1] = ring[i - 1]!;
    const [x2, y2] = ring[i]!;
    sum += (x2! - x1!) * (y2! + y1!);
  }
  return sum > 0;
}

function contains(ring: Position[], [x, y]: Position): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!;
    const [xj, yj] = ring[j]!;
    if (yi! > y! !== yj! > y! && x! < ((xj! - xi!) * (y! - yi!)) / (yj! - yi!) + xi!) {
      inside = !inside;
    }
  }
  return inside;
}

/** Clockwise rings are outer; each hole joins the first outer ring holding it. */
function assemble(rings: Position[][]): Position[][][] {
  const polygons: Position[][][] = [];
  const holes: Position[][] = [];
  for (const ring of rings) {
    if (clockwise(ring)) {
      polygons.push([ring]);
    } else {
      holes.push(ring);
    }
  }
  for (const hole of holes) {
    const owner = polygons.find(([outer]) => contains(outer!, hole[0]!));
    if (owner) {
      owner.push(hole);
    } else {
      polygons.push([hole]);
    }
  }
  return polygons;
}

export interface ReadOptions {
  /** Keep only records whose attributes pass; the others' shapes are not read. */
  keep?: (attributes: Record<string, string>) => boolean;
  /** Round coordinates to this grid, in the file's units, as they are read. */
  grid?: number;
}

function readRing(view: DataView, at: number, count: number, grid: number | undefined): Position[] {
  const ring: Position[] = [];
  for (let k = 0; k < count; k++) {
    let x = view.getFloat64(at + k * 16, true);
    let y = view.getFloat64(at + k * 16 + 8, true);
    if (grid) {
      x = Math.round(x / grid) * grid;
      y = Math.round(y / grid) * grid;
    }
    const last = ring.at(-1);
    if (!last || last[0] !== x || last[1] !== y) {
      ring.push([x, y]);
    }
  }
  return ring;
}

function readShapes(
  shp: Uint8Array,
  wanted: (i: number) => boolean,
  grid?: number,
): Position[][][][] {
  const view = new DataView(shp.buffer, shp.byteOffset, shp.byteLength);
  if (view.getInt32(0) !== 9994) {
    throw new Error("not a Shapefile (.shp header)");
  }
  const shapes: Position[][][][] = [];
  for (let at = 100; at + 8 <= shp.byteLength;) {
    const length = view.getInt32(at + 4) * 2;
    const start = at + 8;
    const type = view.getInt32(start, true);
    if (type === 0 || !wanted(shapes.length)) {
      shapes.push([]);
    } else if (POLYGON_TYPES.has(type)) {
      const parts = view.getInt32(start + 36, true);
      const points = view.getInt32(start + 40, true);
      const offsets = Array.from({ length: parts }, (_, i) =>
        view.getInt32(start + 44 + i * 4, true),
      );
      const xy = start + 44 + parts * 4;
      const rings = offsets
        .map((from, i) => readRing(view, xy + from * 16, (offsets[i + 1] ?? points) - from, grid))
        .filter((ring) => ring.length >= 4);
      shapes.push(assemble(rings));
    } else {
      throw new Error(`shape type ${type} is not a polygon`);
    }
    at = start + length;
  }
  return shapes;
}

function readAttributes(dbf: Uint8Array, encoding: string): Record<string, string>[] {
  const view = new DataView(dbf.buffer, dbf.byteOffset, dbf.byteLength);
  const count = view.getUint32(4, true);
  const headerLength = view.getUint16(8, true);
  const recordLength = view.getUint16(10, true);
  const decoder = new TextDecoder(encoding);
  const fields: { name: string; offset: number; length: number }[] = [];
  for (let at = 32, offset = 1; dbf[at] !== 0x0d && at < headerLength; at += 32) {
    const name = decoder.decode(dbf.subarray(at, at + 11)).replace(/\0.*$/, "");
    const length = dbf[at + 16]!;
    fields.push({ name, offset, length });
    offset += length;
  }
  return Array.from({ length: count }, (_, i) => {
    const record = headerLength + i * recordLength;
    return Object.fromEntries(
      fields.map((f) => [
        f.name,
        decoder.decode(dbf.subarray(record + f.offset, record + f.offset + f.length)).trim(),
      ]),
    );
  });
}

/**
 * The kept records of one layer, with a shape; `cpg` names the attributes'
 * encoding (Latin-1 if absent).
 */
export function readShapefile(
  shp: Uint8Array,
  dbf: Uint8Array,
  cpg?: string,
  { keep = () => true, grid }: ReadOptions = {},
): ShapeRecord[] {
  const attributes = readAttributes(dbf, cpg?.trim() || "latin1");
  const kept = attributes.map(keep);
  const shapes = readShapes(shp, (i) => kept[i] ?? false, grid);
  if (shapes.length !== attributes.length) {
    throw new Error(`${shapes.length} shapes but ${attributes.length} attribute records`);
  }
  return shapes.flatMap((polygons, i) =>
    kept[i] && polygons.length > 0 ? [{ polygons, attributes: attributes[i]! }] : [],
  );
}
