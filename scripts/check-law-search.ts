/**
 * Does the search find the provision a lawyer would open first? A fixed set of
 * questions, each with the ideas a good planner would give and the provisions
 * that must be among the first results. Run against the live site, so it
 * measures what a person gets:
 *
 *   pnpm run check:law-search [https://solon.orangecat.ch]
 *
 * Exit 1 when a question's provision is missing. Not part of `verify`: it needs
 * the network and the loaded law. Add a question whenever an answer was wrong.
 */
const BASE = process.argv[2] ?? "https://solon.orangecat.ch";

interface Case {
  question: string;
  authority: string;
  groups: string[][];
  /** Systematic number and article path the results must include. */
  expect: { number: string; path: string }[];
}

const CASES: Case[] = [
  {
    question: "May a private person keep a wild animal such as a fox? (federal)",
    authority: "ch",
    groups: [
      ["Wildtier", "Wildtiere"],
      ["Haltung", "halten", "Bewilligung"],
    ],
    expect: [{ number: "455.1", path: "art_89" }],
  },
  {
    question: "Do I need a permit to buy a firearm?",
    authority: "ch",
    groups: [
      ["Waffe", "Waffen", "Feuerwaffe"],
      ["Erwerb", "Waffenerwerbsschein"],
    ],
    expect: [{ number: "514.54", path: "art_8" }],
  },
  {
    question: "Can a tenant contest the rent?",
    authority: "ch",
    groups: [
      ["Mietzins", "Mietzinse"],
      ["Anfechtung", "anfechten", "Herabsetzung"],
    ],
    expect: [{ number: "220", path: "art_270_a" }],
  },
  {
    question: "What is the notice period for ending a residential lease?",
    authority: "ch",
    groups: [
      ["Miete", "Mieter", "Vermieter"],
      ["Kündigungsfrist", "Kündigung"],
    ],
    expect: [{ number: "220", path: "art_266_c" }],
  },
  {
    question: "How long can an employer's notice period be during the probation?",
    authority: "ch",
    groups: [["Probezeit"], ["Kündigung", "Kündigungsfrist"]],
    expect: [{ number: "220", path: "art_335_b" }],
  },
  {
    question: "Is a dog licence required in Zürich?",
    authority: "zh",
    groups: [
      ["Hund", "Hunde", "Hundehaltung"],
      ["Haltebewilligung", "Bewilligung", "Hundegesetz"],
    ],
    expect: [{ number: "554.5", path: "par_30" }],
  },
];

async function main(): Promise<number> {
  let failed = 0;
  for (const c of CASES) {
    const params = new URLSearchParams({
      groups: c.groups.map((g) => g.join(",")).join("|"),
      authority: c.authority,
      limit: "10",
    });
    const response = await fetch(`${BASE}/api/v1/law/search?${params}`);
    const { hits } = (await response.json()) as {
      hits: { systematicNumber: string | null; path: string }[];
    };
    const missing = c.expect.filter(
      (e) => !hits.some((h) => h.systematicNumber === e.number && h.path === e.path),
    );
    if (missing.length) failed++;
    console.log(
      `${missing.length ? "FAIL" : "ok  "} ${c.question}${
        missing.length
          ? `\n     missing ${missing.map((m) => `${m.number} ${m.path}`).join(", ")}\n     got ${hits
              .slice(0, 5)
              .map((h) => `${h.systematicNumber} ${h.path}`)
              .join(", ")}`
          : ""
      }`,
    );
  }
  console.log(`\n${CASES.length - failed}/${CASES.length} found`);
  return failed ? 1 : 0;
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    console.error(error);
    process.exit(2);
  },
);
