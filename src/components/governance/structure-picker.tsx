"use client";

import {
  GOVERNANCE_PROFILE_IDS,
  GOVERNANCE_PROFILES,
  type GovernanceProfileId,
} from "@/lib/config/governance-profiles";

/**
 * The founding choice of who decides, rendered from the profile registry.
 *
 * Every option shows its `whoDecides` sentence — the same one the organization
 * page shows people before they join — so a founder picks a structure by what
 * it will say to their members, not by a name.
 */
export default function StructurePicker({
  value,
  onChange,
}: {
  value: GovernanceProfileId;
  onChange: (id: GovernanceProfileId) => void;
}) {
  return (
    <fieldset>
      <legend className="block text-sm font-medium text-fg-primary">Who decides</legend>
      <p className="mt-1 text-xs text-fg-tertiary">
        You can change this later &mdash; changing it is a decision about the rules, taken under the
        structure you pick now.
      </p>
      <div className="mt-3 grid gap-2">
        {GOVERNANCE_PROFILE_IDS.map((id) => {
          const profile = GOVERNANCE_PROFILES[id];
          const selected = id === value;
          return (
            <label
              key={id}
              className={`flex min-h-11 cursor-pointer gap-3 rounded-control border p-3 ${
                selected ? "border-accent bg-surface-raised" : "border-default"
              }`}
            >
              <input
                type="radio"
                name="governance-profile"
                value={id}
                checked={selected}
                onChange={() => onChange(id)}
                className="mt-1"
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-fg-primary">{profile.label}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-fg-secondary">
                  {selected ? profile.whoDecides : profile.suitedTo}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
