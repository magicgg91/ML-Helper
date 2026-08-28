"use client";

import { useState } from "react";
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
    setDraft(null);
    const clamped = clamp(candidate);
    setLastReported(clamped);
    onChange(clamped);
    onCommit?.(clamped);
  }

  // Bloc 34/C: the displayed text is a local draft while the user is
  // typing, decoupled from this field's own min/max — so typing "100"
  // over a min-2 field keeps showing "1", then "10", then "100" instead
  // of resetting mid-keystroke back to "2". onChange still only ever
  // receives an already-clamped value (a review flagged the first version
  // of this fix for letting a raw out-of-range draft, e.g. "200" over a
  // max-20 field, reach calculator state before blur).
  //
  // Some callers apply their *own* extra clamp on top (e.g. Gems' slot
  // count, capped by how many other rows already used) and expect that to
  // show up immediately rather than waiting for blur — tracked via
  // lastReported: if the value coming back down doesn't match what we
  // just reported, the caller did something beyond our own clamp, so the
  // draft is dropped in favor of that authoritative value.
  const [draft, setDraft] = useState<string | null>(null);
  const [lastReported, setLastReported] = useState<number | null>(null);
  // Adjusted during render rather than in a useEffect — an effect would
  // still show the stale draft for one extra render/commit, and (per
  // React's own guidance on this pattern) adds a real timing gap in a
  // component this widely reused: a re-render arriving from elsewhere
  // (e.g. a parent re-syncing from localStorage) between the effect being
  // scheduled and actually running could let a stale draft linger, or
  // clear a fresh one, depending on exactly how those renders interleave.
  if (draft !== null && value !== lastReported) setDraft(null);
  const displayValue = draft ?? String(value);

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
        value={displayValue}
        min={Number.isFinite(min) ? min : undefined}
        max={Number.isFinite(max) ? max : undefined}
        step={step}
        onChange={(event) => {
          setDraft(event.target.value);
          const clamped = clamp(Number(event.target.value) || 0);
          setLastReported(clamped);
          onChange(clamped);
        }}
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
