"use client";

import { methodSpec } from "@/lib/domain/methods";
import type { MethodId } from "@/lib/domain/methods/types";

/**
 * Choosing how a question gets decided.
 *
 * The default is deliberately "however this organization normally decides this
 * kind of thing" — a proposer should not have to hold an opinion about voting
 * theory to file a proposal, and the organization's profile already encodes
 * the house rule. Picking a method is the override, offered because the
 * instrument genuinely depends on the question: a budget split is a dot vote
 * whatever the house style.
 */
export default function MethodPicker({
  methods,
  value,
  onChange,
}: {
  methods: MethodId[];
  value: string;
  onChange: (method: string) => void;
}) {
  const active = value ? methodSpec(value as MethodId) : null;

  return (
    <div>
      <label className="block text-sm font-medium text-fg-primary" htmlFor="p-method">
        How should this be decided?
      </label>
      <select
        id="p-method"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="field mt-2"
      >
        <option value="">However this organization usually decides this</option>
        {methods.map((m) => (
          <option key={m} value={m}>
            {methodSpec(m).label}
          </option>
        ))}
      </select>
      <p className="mt-1.5 text-xs text-fg-tertiary">
        {active
          ? active.summary
          : "Your organization's rules already say how this kind of decision is voted on, how many must take part and how many must agree."}
      </p>
    </div>
  );
}
