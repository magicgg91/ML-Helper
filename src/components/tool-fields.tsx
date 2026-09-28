"use client";

/**
 * Bloc 114: the two parameter controls the tools share.
 *
 * Both were written inside city-calculators.tsx by Bloc 113, and the Combat
 * tool needs the same two: a plain counter (its target-city level, violet
 * bordered like Villes' own target fields) and a counter with a k/M/G/T unit
 * beside it (its "Ma VP"). They are here so the two tools cannot drift into
 * two different-looking steppers.
 */

import { NumberStepper } from "./number-stepper";

/** The multiplier a k/M/G/T select applies to the figure beside it. */
export type AmountUnit =
  1 | 1_000 | 1_000_000 | 1_000_000_000 | 1_000_000_000_000;

export function Field({
  label,
  accessibleLabel,
  value,
  onChange,
  onCommit,
  min = 1,
  max,
  step,
  className,
}: {
  label: string;
  /**
   * Bloc 113/E: a longer name for the control alone, when two fields share a
   * visible label. It must CONTAIN that label (WCAG 2.5.3) — "Heures reçues —
   * Armée" does, so speech input still reaches the field by what it reads.
   */
  accessibleLabel?: string;
  value: number;
  onChange: (value: number) => void;
  onCommit?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}) {
  return (
    <label
      className={
        className ? `calculator-field ${className}` : "calculator-field"
      }
    >
      {label}
      <NumberStepper
        label={accessibleLabel ?? label}
        value={value}
        onChange={onChange}
        onCommit={onCommit}
        min={min}
        max={max}
        step={step}
      />
    </label>
  );
}

export function AmountUnitField({
  label,
  unitLabel,
  amount,
  unit,
  onAmountChange,
  onUnitChange,
  className,
}: {
  label: string;
  unitLabel: string;
  amount: number;
  unit: AmountUnit;
  onAmountChange: (value: number) => void;
  onUnitChange: (value: AmountUnit) => void;
  className?: string;
}) {
  return (
    <label
      className={
        className ? `calculator-field ${className}` : "calculator-field"
      }
    >
      {label}
      <div className="unit-input">
        <NumberStepper
          label={label}
          value={amount}
          min={0}
          step={0.1}
          onChange={onAmountChange}
        />
        <select
          aria-label={unitLabel}
          value={unit}
          onChange={(event) =>
            onUnitChange(Number(event.target.value) as AmountUnit)
          }
        >
          <option value={1}>×1</option>
          <option value={1_000}>k</option>
          <option value={1_000_000}>M</option>
          <option value={1_000_000_000}>G</option>
          <option value={1_000_000_000_000}>T</option>
        </select>
      </div>
    </label>
  );
}
