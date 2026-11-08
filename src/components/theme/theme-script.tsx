import { THEME_SCRIPT } from "./theme";

/**
 * Sets the theme before the first paint, so a reader who chose dark (or whose
 * device is dark) never sees a flash of light. Render it inside `<head>` and
 * give `<html>` `suppressHydrationWarning`: the class and attributes it adds
 * are not in the server's HTML, on purpose.
 */
export default function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />;
}
