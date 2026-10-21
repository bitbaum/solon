export type ChatEvent =
  | { type: "text"; text: string }
  | { type: "done"; text: string; model: string }
  | { type: "error"; error: string };
