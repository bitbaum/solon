/** What the research route sends while it works: the steps, the sources found, then the report or why none. */
export type ResearchEvent =
  | { type: "step"; step: "search" | "write" }
  | { type: "activity"; tool: string; detail: string }
  | { type: "sources"; sources: { id: string; text: string; href?: string }[] }
  | { type: "done"; text: string; cited: string[]; model: string | null }
  | { type: "error"; error: string; unverified?: true };
