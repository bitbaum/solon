export type ChatEvent =
  | { type: "text"; text: string }
  | { type: "done"; text: string; model: string }
  | { type: "error"; error: string };

/** What the law chat sends while it works: a step, the sources found, then the answer. */
export type LawChatEvent =
  | { type: "step"; step: "plan" | "search" | "check" | "research" | "write" }
  /** What the research step is doing: `web:<query>`, `read:<url>`, `law:<anchor>`, `search:<words>`. */
  | { type: "activity"; label: string }
  | { type: "plan"; authorities: string[]; acts: string[]; groups: string[][] }
  | { type: "sources"; sources: { id: string; label: string; detail: string; href: string }[] }
  | ChatEvent;
