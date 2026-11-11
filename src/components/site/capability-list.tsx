import { useTranslations } from "next-intl";
import { CAPABILITIES, type CapabilityKey } from "@/lib/content/capabilities";
import StatusList from "./status-list";

/**
 * Which of the capabilities a page names are real today. The status comes
 * from lib/content/capabilities.ts, never from the page — so the page cannot
 * overstate it.
 */
export default function CapabilityList({ items }: { items: CapabilityKey[] }) {
  const t = useTranslations("Capabilities");
  const status = useTranslations("Status");
  return (
    <StatusList
      items={items.map((key) => ({
        key,
        name: t(`${key}.name`),
        body: t(`${key}.body`),
        status: CAPABILITIES[key],
      }))}
      statusLabel={(s) => status(s)}
    />
  );
}
