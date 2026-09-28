import { CAPABILITY_MAP_PAGE } from "@/lib/config/capabilities";

/**
 * The door: one question in, a drafted proposal out. A plain GET form to
 * /propose, which already reads `title` from its query (proposal-draft.ts) and
 * carries it through sign-in and joining — so the question survives everything
 * between typing it and signing it.
 */
export default function TheDoor({ className = "" }: { className?: string }) {
  const { door } = CAPABILITY_MAP_PAGE;
  return (
    <form
      action="/propose"
      method="get"
      role="search"
      aria-label={door.prompt}
      className={className}
    >
      <label htmlFor="the-door" className="block text-sm font-medium text-fg-primary">
        {door.prompt}
      </label>
      <div className="mt-2 flex items-stretch gap-2 rounded-control border border-default bg-surface-base p-1.5">
        <input
          id="the-door"
          name="title"
          type="text"
          required
          minLength={3}
          maxLength={200}
          autoComplete="off"
          placeholder={door.placeholder}
          className="min-h-11 min-w-0 flex-1 bg-transparent px-3 text-base text-fg-primary placeholder:text-fg-tertiary focus:outline-none"
        />
        <button type="submit" className="btn-frame-accent min-h-11">
          {door.button}
        </button>
      </div>
    </form>
  );
}
