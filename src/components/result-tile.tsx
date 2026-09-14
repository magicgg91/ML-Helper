"use client";

/**
 * Bloc 93/M1: the calculator result tile — a label above a value, in a
 * .total-box. City's `Stat` and Skills' `Result` were the same component
 * declared twice, differing only in the order of their prop declarations.
 *
 * `tone` is the emerald accent used for a headline figure; the classes stay
 * exactly as the two copies had them so no styling moves.
 */
export function ResultTile({
  label,
  value,
  tone,
  testId,
}: {
  label: string;
  value: string;
  tone?: "emerald";
  testId?: string;
}) {
  return (
    <div className="calculator-stat total-box">
      <span className="label">{label}</span>
      <strong className={tone ? `value ${tone}` : "value"} data-testid={testId}>
        {value}
      </strong>
    </div>
  );
}
