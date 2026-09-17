"use client";

import { useState } from "react";
import { SUPERMAJORITY_FRACTION } from "@/lib/config/governance";

/**
 * Quorum and threshold, as two knobs over one room.
 *
 * These are the two numbers every constitution argues about and almost no tool
 * lets you feel. Move turnout and the same split passes or fails on quorum
 * alone; move the threshold and a comfortable majority stops being enough. The
 * arithmetic is the arithmetic Solon applies at close — a session is decisive
 * only if cast weight clears quorum, and approved only if the for-side clears
 * the threshold over for+against, with abstentions counting toward the first
 * test and not the second.
 */

const ELIGIBLE = 100;

export function QuorumLab() {
  const [turnout, setTurnout] = useState(55);
  const [yesShare, setYesShare] = useState(60);
  const [quorum, setQuorum] = useState(50);
  const [supermajority, setSupermajority] = useState(false);

  const cast = Math.round((turnout / 100) * ELIGIBLE);
  // Abstentions are real: they reach quorum and then drop out of the result.
  const abstain = Math.round(cast * 0.1);
  const decisive = cast - abstain;
  const yes = Math.round((yesShare / 100) * decisive);
  const no = decisive - yes;

  const need = supermajority ? SUPERMAJORITY_FRACTION : 0.5;
  const quorumMet = cast >= (quorum / 100) * ELIGIBLE;
  const thresholdMet = decisive > 0 && (supermajority ? yes / decisive >= need : yes > no);
  const passes = quorumMet && thresholdMet;

  return (
    <div className="space-y-8">
      <div className="grid gap-6 sm:grid-cols-2">
        <Knob
          label="Turnout"
          value={turnout}
          suffix="% of eligible weight cast a ballot"
          onChange={setTurnout}
        />
        <Knob
          label="Quorum required"
          value={quorum}
          suffix="% must vote for the result to bind"
          onChange={setQuorum}
        />
        <Knob
          label="Yes share"
          value={yesShare}
          suffix="% of the decisive votes are yes"
          onChange={setYesShare}
        />
        <div>
          <span className="text-xs uppercase tracking-caps text-fg-muted">Threshold</span>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setSupermajority(false)}
              aria-pressed={!supermajority}
              className={`min-h-11 flex-1 rounded-control border px-3 text-sm transition-colors ${
                !supermajority
                  ? "border-accent bg-accent text-on-accent"
                  : "border-default text-fg-secondary hover:text-fg-primary"
              }`}
            >
              Simple majority
            </button>
            <button
              type="button"
              onClick={() => setSupermajority(true)}
              aria-pressed={supermajority}
              className={`min-h-11 flex-1 rounded-control border px-3 text-sm transition-colors ${
                supermajority
                  ? "border-accent bg-accent text-on-accent"
                  : "border-default text-fg-secondary hover:text-fg-primary"
              }`}
            >
              Supermajority (⅔)
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-control border border-default bg-surface-raised p-5 sm:p-6">
        <div className="flex h-3 w-full overflow-hidden rounded-pill bg-surface-overlay">
          <div className="bg-status-positive" style={{ width: `${yes}%` }} />
          <div className="bg-status-negative" style={{ width: `${no}%` }} />
          <div className="bg-status-neutral" style={{ width: `${abstain}%` }} />
        </div>
        <p className="mt-3 text-xs text-fg-muted">
          The bar is the whole electorate of {ELIGIBLE}. The unfilled part is the members who did
          not vote — which is what a quorum measures.
        </p>
        <dl className="mt-5 grid grid-cols-2 gap-5 sm:grid-cols-4">
          <Stat label="Cast" value={`${cast}`} />
          <Stat label="Yes" value={`${yes}`} />
          <Stat label="No" value={`${no}`} />
          <Stat label="Abstain" value={`${abstain}`} />
        </dl>

        <ul className="mt-6 space-y-2 border-t border-subtle pt-5 text-sm">
          <Test ok={quorumMet}>
            Quorum: {cast} of {ELIGIBLE} cast, {quorum} needed
          </Test>
          <Test ok={thresholdMet}>
            Threshold: {yes} yes against {no} no
            {supermajority ? `, two thirds of ${decisive} is ${Math.ceil(decisive * need)}` : ""}
          </Test>
        </ul>

        <p className="mt-6 border-t border-subtle pt-5">
          <span
            className={`inline-flex items-center gap-2 rounded-pill border px-4 py-2 text-sm font-semibold ${
              passes
                ? "border-status-positive text-status-positive"
                : "border-status-negative text-status-negative"
            }`}
          >
            {passes ? "Approved" : quorumMet ? "Rejected" : "Not decisive — quorum missed"}
          </span>
        </p>
        {!quorumMet && (
          <p className="mt-4 max-w-copy text-sm leading-relaxed text-fg-secondary">
            Quorum failing is not the same as the proposal failing. Nothing was decided, so nothing
            can be cited later as having been decided — which is exactly what a quorum is for.
          </p>
        )}
      </div>
    </div>
  );
}

function Knob({
  label,
  value,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  suffix: string;
  onChange: (n: number) => void;
}) {
  const id = label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div>
      <label htmlFor={id} className="text-xs uppercase tracking-caps text-fg-muted">
        {label}
      </label>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-mono text-2xl tabular-nums text-fg-primary">{value}</span>
        <span className="text-xs text-fg-secondary">{suffix}</span>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-3 h-11 w-full accent-accent"
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-caps text-fg-muted">{label}</dt>
      <dd className="mt-1 font-mono text-2xl tabular-nums text-fg-primary">{value}</dd>
    </div>
  );
}

function Test({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span
        className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-pill ${ok ? "bg-status-positive" : "bg-status-negative"}`}
        aria-hidden
      />
      <span className={ok ? "text-fg-secondary" : "text-fg-primary"}>
        {children} — <span className="font-semibold">{ok ? "met" : "not met"}</span>
      </span>
    </li>
  );
}
