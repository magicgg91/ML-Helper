"use client";

import { useTranslations } from "next-intl";
import { selectOnFocus } from "../lib/utils";

type NumberStepperProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  // Bloc 34/C: called with the clamped value only when a caller needs extra
  // validation beyond this field's own min/max — e.g. a cross-field bound
  // (target level > another field's current value) that can't be expressed
  // as a static min/max prop. Fires alongside onChange at commit time
  // (blur, +/- buttons), never while the user is still typing.
  onCommit?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
};

export function NumberStepper({
  label,
  value,
  onChange,
  onCommit,
  min = Number.NEGATIVE_INFINITY,
  max = Number.POSITIVE_INFINITY,
  step = 1,
}: NumberStepperProps) {
  const t = useTranslations("common");
  const clamp = (candidate: number) =>
    Math.min(max, Math.max(min, Math.round(candidate * 1000) / 1000));
  function commit(candidate: number) {
    const clamped = clamp(candidate);
    onChange(clamped);
    onCommit?.(clamped);
  }

  return (
    <div className="num-stepper number-stepper">
      <button
        type="button"
        aria-label={t("decrease", { label })}
        onClick={() => commit(value - step)}
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
        // Bloc 34/C: no min/max clamp here — clamping on every keystroke
        // reset the field mid-typing whenever the value momentarily dipped
        // below min (e.g. typing "100" over a min-2 field got reset to "2"
        // after the leading "1"). Typing now flows freely; the min/max
        // constraint is enforced only on blur, below.
        onChange={(event) => onChange(Number(event.target.value) || 0)}
        onFocus={selectOnFocus}
        onBlur={(event) => commit(Number(event.target.value) || 0)}
      />
      <button
        type="button"
        aria-label={t("increase", { label })}
        onClick={() => commit(value + step)}
      >
        +
      </button>
    </div>
  );
}
