"use client";

import { useTranslations } from "next-intl";
import { deadlineCalendar } from "@/lib/places/calendar";
import type { PlaceAction } from "@/lib/places/place-view";

/**
 * The deadlines of a list of actions as a calendar file, made on the device
 * when the reader asks for it: nothing about them is sent anywhere.
 */
export default function CalendarButton({ actions }: { actions: readonly PlaceAction[] }) {
  const t = useTranslations("Places.actions");
  if (!actions.some((a) => a.deadline)) return null;
  const download = () => {
    const ics = deadlineCalendar(actions, {
      now: new Date(),
      summary: (a) => t("calendarEvent", { action: a.label, place: a.offeredBy.name }),
      sourceLabel: t("calendarSource"),
    });
    if (!ics) return;
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "tax-deadlines.ics";
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <button
      type="button"
      onClick={download}
      className="mt-3 text-sm font-medium text-fg-primary underline-offset-2 hover:underline"
    >
      {t("calendar")}
    </button>
  );
}
