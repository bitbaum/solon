"use client";

import { useTranslations } from "next-intl";
import type { CompareTaxPack } from "@/lib/places/compare-view";
import type { PackInput } from "./device-inputs";

interface TaxSituationProps {
  pack: CompareTaxPack;
  input: PackInput;
  onChange: (patch: Partial<PackInput>) => void;
  title: string;
  /** Keeps ids unique when two forms share a page. */
  idPrefix: string;
  /** Side by side on wide screens (/compare), stacked in a narrow column (the map). */
  layout?: "wide" | "narrow";
}

/** The reader's income, household and yes-or-no inputs for one pack's tax model. */
export default function TaxSituation({
  pack,
  input,
  onChange,
  title,
  idPrefix,
  layout = "wide",
}: TaxSituationProps) {
  const t = useTranslations("Places.compare");
  const amountId = `${idPrefix}-amount-${pack.key}`;
  const optionRow =
    "flex min-h-11 cursor-pointer items-center gap-3 rounded-control border px-3 text-sm";
  return (
    <section
      aria-labelledby={`${amountId}-title`}
      className="space-y-5 rounded-surface border border-default bg-surface-base p-5 sm:p-6"
    >
      <h2 id={`${amountId}-title`} className="font-semibold text-fg-primary">
        {title}
      </h2>
      <div className={layout === "wide" ? "grid gap-5 md:grid-cols-2" : "grid gap-5"}>
        <div>
          <label htmlFor={amountId} className="block text-sm font-medium text-fg-primary">
            {pack.base.label}
          </label>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-sm text-fg-secondary" aria-hidden>
              {pack.currency}
            </span>
            <input
              id={amountId}
              inputMode="numeric"
              autoComplete="off"
              value={input.amount}
              onChange={(e) => onChange({ amount: e.target.value })}
              placeholder={t("amountPlaceholder")}
              aria-describedby={`${amountId}-hint`}
              className="field"
            />
          </div>
          <p id={`${amountId}-hint`} className="mt-2 text-xs text-fg-tertiary">
            {pack.base.hint && `${pack.base.hint} `}
            {t("privacy")}
          </p>
        </div>
        {pack.amounts.map((amount) => {
          const id = `${idPrefix}-amount-${pack.key}-${amount.key}`;
          return (
            <div key={amount.key}>
              <label htmlFor={id} className="block text-sm font-medium text-fg-primary">
                {amount.label}
              </label>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-sm text-fg-secondary" aria-hidden>
                  {pack.currency}
                </span>
                <input
                  id={id}
                  inputMode="numeric"
                  autoComplete="off"
                  value={input.amounts[amount.key] ?? ""}
                  onChange={(e) =>
                    onChange({ amounts: { ...input.amounts, [amount.key]: e.target.value } })
                  }
                  placeholder={t("amountPlaceholder")}
                  aria-describedby={amount.hint ? `${id}-hint` : undefined}
                  className="field"
                />
              </div>
              {amount.hint && (
                <p id={`${id}-hint`} className="mt-2 text-xs text-fg-tertiary">
                  {amount.hint}
                </p>
              )}
            </div>
          );
        })}
        {pack.variants.length > 1 && (
          <fieldset>
            <legend className="block text-sm font-medium text-fg-primary">{t("household")}</legend>
            <div className="mt-2 space-y-2">
              {pack.variants.map((variant) => (
                <label
                  key={variant.key}
                  className={`${optionRow} ${
                    input.variant === variant.key
                      ? "border-accent bg-surface-raised text-fg-primary"
                      : "border-default text-fg-secondary"
                  }`}
                >
                  <input
                    type="radio"
                    name={`${idPrefix}-variant-${pack.key}`}
                    value={variant.key}
                    checked={input.variant === variant.key}
                    onChange={() => onChange({ variant: variant.key })}
                  />
                  {variant.label}
                </label>
              ))}
            </div>
          </fieldset>
        )}
        {pack.choices.map((choice) => {
          const picked = choice.options.find((o) => input.conditions[o.key] === true)?.key ?? "";
          const pick = (key: string) =>
            onChange({
              conditions: {
                ...input.conditions,
                ...Object.fromEntries(choice.options.map((o) => [o.key, o.key === key])),
              },
            });
          return (
            <fieldset key={choice.key}>
              <legend className="block text-sm font-medium text-fg-primary">{choice.label}</legend>
              <div className="mt-2 space-y-2">
                {[{ key: "", label: choice.none }, ...choice.options].map((option) => (
                  <label
                    key={option.key}
                    className={`${optionRow} ${
                      picked === option.key
                        ? "border-accent bg-surface-raised text-fg-primary"
                        : "border-default text-fg-secondary"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`${idPrefix}-choice-${pack.key}-${choice.key}`}
                      value={option.key}
                      checked={picked === option.key}
                      onChange={() => pick(option.key)}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </fieldset>
          );
        })}
        {pack.conditions.map((condition) => (
          <label
            key={condition.key}
            className="flex min-h-11 items-center gap-3 text-sm text-fg-primary"
          >
            <input
              type="checkbox"
              checked={input.conditions[condition.key] === true}
              onChange={(e) =>
                onChange({
                  conditions: { ...input.conditions, [condition.key]: e.target.checked },
                })
              }
            />
            {condition.label}
          </label>
        ))}
      </div>
    </section>
  );
}
