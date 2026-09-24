/**
 * Bloc 119 §3 bis: the little bar next to a percentage — the XP rate of a
 * tier, the share of the walls a demo attack fields.
 *
 * Decoration, and marked as such: the number it illustrates is in the cell
 * beside it, so repeating it to a screen reader would only be noise.
 */
export function PreviewBar({
  value,
  max,
}: {
  value: number | null;
  /** What a full bar means — 100 for a percentage, the largest row otherwise. */
  max: number;
}) {
  const share =
    value === null || !Number.isFinite(value) || max <= 0
      ? 0
      : Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <span
      aria-hidden="true"
      className="block h-2 w-full min-w-[80px] overflow-hidden rounded-full bg-admin-rule"
    >
      <span
        className="block h-full rounded-full bg-admin-accent"
        style={{ width: `${share}%` }}
      />
    </span>
  );
}
