import type { PlaceAction } from "@/lib/places/place-view";

interface ActionListProps {
  actions: readonly PlaceAction[];
  /** "Usually due by 31 March", for a deadline. */
  due: (date: Date) => string;
  /** What the deadline's source link says. */
  dueSource: string;
  /** Name the authority under each action; a comparison's column already says it. */
  showOfferedBy?: boolean;
}

/** A day of the year as a date the formatter can name, at noon UTC so no time zone moves it. */
function dayOfYear(monthDay: string): Date {
  const [month, day] = monthDay.split("-").map(Number);
  return new Date(Date.UTC(2001, month! - 1, day!, 12));
}

/**
 * What a resident can do, each at the authority's own page: the place page and
 * the comparison show the same list, so an action looks the same wherever it
 * is offered.
 */
export default function ActionList({
  actions,
  due,
  dueSource,
  showOfferedBy = true,
}: ActionListProps) {
  return (
    <ul className="space-y-3">
      {actions.map((action) => (
        <li key={action.kind}>
          <a
            href={action.url}
            rel="noopener noreferrer"
            className="font-medium text-fg-primary underline-offset-2 hover:underline"
          >
            {action.label} <span aria-hidden>↗</span>
          </a>
          {(showOfferedBy || action.deadline) && (
            <span className="mt-0.5 block text-xs text-fg-tertiary">
              {showOfferedBy && action.offeredBy.name}
              {showOfferedBy && action.deadline && " · "}
              {action.deadline && (
                <>
                  {due(dayOfYear(action.deadline.monthDay))} (
                  <a
                    href={action.deadline.source}
                    rel="noopener noreferrer"
                    className="hover:text-fg-secondary hover:underline"
                  >
                    {dueSource}
                  </a>
                  )
                </>
              )}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
