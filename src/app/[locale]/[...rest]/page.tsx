import { notFound } from "next/navigation";

/**
 * Any address under a locale that no page claims. Without this, Next answers it with its own bare 404 outside
 * the locale layout; throwing here renders `../not-found.tsx` inside it.
 */
export default function UnknownAddress() {
  notFound();
}
