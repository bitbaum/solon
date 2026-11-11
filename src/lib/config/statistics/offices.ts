/**
 * The institutions responsible for a place's statistics, and their official channels
 * (src/lib/statistics/gaps.ts). Only an institution's own channel is kept: the general address
 * its page names, never a person. `statistics:verify` reads each page again and fails when it no
 * longer says what is relied on.
 */
export const OFFICES = [
  {
    key: "dk.statistics-denmark",
    place: { scheme: "iso_3166_1", value: "DK" },
    name: "Statistics Denmark (Danmarks Statistik)",
    contacts: [
      { kind: "page", value: "https://www.dst.dk/en/OmDS/kontakt" },
      { kind: "email", value: "dst@dst.dk" },
      { kind: "phone", value: "+45 39 17 39 17" },
      { kind: "postal", value: "Sankt Kjelds Plads 11" },
    ],
    evidence: [
      {
        publisher: "Statistics Denmark: Contact Statistics Denmark",
        url: "https://www.dst.dk/en/OmDS/kontakt",
        read: "2026-11-11",
        expect: ["dst@dst.dk", "+45 39 17 39 17", "Sankt Kjelds Plads 11", "Copenhagen"],
      },
    ],
  },
] as const;
