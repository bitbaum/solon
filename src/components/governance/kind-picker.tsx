"use client";

import { COLLECTIVE_KIND_LIST, type CollectiveKindId } from "@/lib/collective-kinds";

/**
 * What kind of body is this — rendered from the shared kind list, so the same
 * eleven words a founder sees here are the ones OrangeCat's group form shows.
 * Picking a kind suggests how it decides (KIND_DEFAULT_PROFILE); it never
 * locks it.
 */
export default function KindPicker({
  value,
  onChange,
}: {
  value: CollectiveKindId;
  onChange: (id: CollectiveKindId) => void;
}) {
  return (
    <fieldset>
      <legend className="block text-sm font-medium text-fg-primary">What kind of body</legend>
      <p className="mt-1 text-xs text-fg-tertiary">
        The word for what you are. A town or a local fund belongs to a place; the rest may name one.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {COLLECTIVE_KIND_LIST.map((kind) => {
          const selected = kind.id === value;
          return (
            <label
              key={kind.id}
              className={`flex min-h-11 cursor-pointer gap-3 rounded-control border p-3 ${
                selected ? "border-accent bg-surface-raised" : "border-default"
              }`}
            >
              <input
                type="radio"
                name="collective-kind"
                value={kind.id}
                checked={selected}
                onChange={() => onChange(kind.id)}
                className="mt-1"
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-fg-primary">{kind.name}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-fg-secondary">
                  {kind.description}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
