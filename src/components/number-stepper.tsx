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
  const clamp = (candidate: number) =>
    Math.min(max, Math.max(min, Math.round(candidate * 1000) / 1000));

  return (
    <div className="num-stepper number-stepper">
      <button
        type="button"
        aria-label={`Diminuer ${label}`}
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
        aria-label={`Augmenter ${label}`}
        onClick={() => onChange(clamp(value + step))}
      >
        +
      </button>
    </div>
  );
}
