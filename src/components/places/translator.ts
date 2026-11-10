import type { useTranslations } from "next-intl";

/** The translator the places components take: one type, so none imports another for it. */
export type PlacesTranslator = ReturnType<typeof useTranslations<"Places">>;
