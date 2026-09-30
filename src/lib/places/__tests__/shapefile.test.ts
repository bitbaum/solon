import { describe, expect, it } from "vitest";
import { readShapefile } from "../adapters/shapefile";

type Ring = [number, number][];

/** A `.shp` of PolygonZ records (null for a null shape), as the format lays them out. */
function shp(records: (Ring[] | null)[]): Uint8Array {
  const bodies = records.map((rings) => {
    if (!rings) {
      const body = new DataView(new ArrayBuffer(4));
      body.setInt32(0, 0, true);
      return body;
    }
    const points = rings.flat();
    const size = 44 + rings.length * 4 + points.length * 16 + 16 + points.length * 8;
    const body = new DataView(new ArrayBuffer(size));
    body.setInt32(0, 15, true);
    body.setInt32(36, rings.length, true);
    body.setInt32(40, points.length, true);
    let start = 0;
    rings.forEach((ring, i) => {
      body.setInt32(44 + i * 4, start, true);
      start += ring.length;
    });
    const xy = 44 + rings.length * 4;
    points.forEach(([x, y], k) => {
      body.setFloat64(xy + k * 16, x, true);
      body.setFloat64(xy + k * 16 + 8, y, true);
    });
    return body;
  });
  const length = 100 + bodies.reduce((n, b) => n + 8 + b.byteLength, 0);
  const out = new Uint8Array(length);
  const view = new DataView(out.buffer);
  view.setInt32(0, 9994);
  view.setInt32(24, length / 2);
  let at = 100;
  bodies.forEach((body, i) => {
    view.setInt32(at, i + 1);
    view.setInt32(at + 4, body.byteLength / 2);
    out.set(new Uint8Array(body.buffer), at + 8);
    at += 8 + body.byteLength;
  });
  return out;
}

/** A dBase III `.dbf` with one character field, `CODE`, ten wide. */
function dbf(codes: string[]): Uint8Array {
  const header = 32 + 32 + 1;
  const record = 1 + 10;
  const out = new Uint8Array(header + codes.length * record + 1);
  const view = new DataView(out.buffer);
  out[0] = 3;
  view.setUint32(4, codes.length, true);
  view.setUint16(8, header, true);
  view.setUint16(10, record, true);
  out.set(new TextEncoder().encode("CODE"), 32);
  out[32 + 11] = "C".charCodeAt(0);
  out[32 + 16] = 10;
  out[64] = 0x0d;
  codes.forEach((code, i) => {
    out.set(new TextEncoder().encode(` ${code.padEnd(10)}`), header + i * record);
  });
  return out;
}

const square = (x: number, y: number, size: number, clockwise = true): Ring => {
  const ring: Ring = [
    [x, y],
    [x, y + size],
    [x + size, y + size],
    [x + size, y],
    [x, y],
  ];
  return clockwise ? ring : ring.reverse();
};

describe("readShapefile", () => {
  it("gives a hole to the outer ring around it, and keeps a second outer ring apart", () => {
    const [record] = readShapefile(
      shp([[square(0, 0, 10), square(4, 4, 2, false), square(20, 0, 5)]]),
      dbf(["A"]),
    );
    expect(record?.attributes).toEqual({ CODE: "A" });
    expect(record?.polygons).toEqual([
      [square(0, 0, 10), square(4, 4, 2, false)],
      [square(20, 0, 5)],
    ]);
  });

  it("snaps to the grid as it reads, drops repeated points and collapsed rings", () => {
    const [record] = readShapefile(
      shp([
        [
          [
            [0, 0],
            [0.2, 9.8],
            [0, 10],
            [10, 10],
            [10, 0],
            [0, 0],
          ],
          square(50, 50, 0.2),
        ],
      ]),
      dbf(["A"]),
      undefined,
      { grid: 1 },
    );
    expect(record?.polygons).toEqual([[square(0, 0, 10)]]);
  });

  it("reads only the records kept, and leaves out null shapes", () => {
    const records = readShapefile(
      shp([[square(0, 0, 1)], null, [square(2, 2, 1)]]),
      dbf(["A", "B", "C"]),
      "UTF-8",
      {
        keep: (attributes) => attributes.CODE !== "A",
      },
    );
    expect(records.map((r) => r.attributes.CODE)).toEqual(["C"]);
  });

  it("refuses a file that is not a Shapefile, or whose records do not match", () => {
    expect(() => readShapefile(new Uint8Array(100), dbf([]))).toThrow(/not a Shapefile/);
    expect(() => readShapefile(shp([[square(0, 0, 1)]]), dbf(["A", "B"]))).toThrow(
      /1 shapes but 2 attribute records/,
    );
  });
});
