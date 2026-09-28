/**
 * Bloc 113: the shared attributes of every line icon on this site.
 *
 * Stroke on currentColor, never a fill and never an emoji, so an icon takes
 * the color of the element it sits in. They are decorative by construction —
 * each one sits beside text that already says the same thing — hence the
 * permanent aria-hidden rather than a per-icon decision.
 */
export const strokeIcon = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
  focusable: "false",
} as const;
