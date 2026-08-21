"use client";

import { useTranslations } from "next-intl";

type NumberStepperProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
};

export function NumberStepper({
  label,
  value,
  onChange,
  min = Number.NEGATIVE_INFINITY,
  max = Number.POSITIVE_INFINITY,
  step = 1,
}: NumberStepperProps) {
  const t = useTranslations("common");
  const clamp = (candidate: number) =>
    Math.min(max, Math.max(min, Math.round(candidate * 1000) / 1000));

  return (
    <div className="num-stepper number-stepper">
      <button
        type="button"
        aria-label={t("decrease", { label })}
        onClick={() => onChange(clamp(value - step))}
      >
        −
      </button>
      <input
        aria-label={label}
        type="number"
        value={value}
        min={Number.isFinite(min) ? min : undefined}
        max={Number.isFinite(max) ? max : undefined}
        step={step}
        onChange={(event) => onChange(clamp(Number(event.target.value) || 0))}
      />
      <button
        type="button"
        aria-label={t("increase", { label })}
        onClick={() => onChange(clamp(value + step))}
      >
        +
      </button>
    </div>
  );
}
