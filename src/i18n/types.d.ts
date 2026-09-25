import type { Locale } from "./routing";
import type en from "../../messages/en.json";

// English is the shape every translation must have. Declaring it here makes
// every t("…") key checked at compile time: a typo, or a key used in code but
// missing from en.json, fails `pnpm typecheck` instead of rendering a raw key.
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof en;
  }
}
