/**
 * Bloc 112: the line icons of the Classement range tiles.
 *
 * Stroke SVG on currentColor, never emoji — they inherit the color of the
 * element they sit in, so the movement badge and the reward labels each tint
 * their own icon with no extra prop.
 *
 * All of them are decorative: every one sits beside text that already says
 * the same thing (the movement verb, the reward's name), so they carry
 * aria-hidden and are skipped by screen readers rather than read twice.
 */

import type { RankMovement, RankRewardType } from "../lib/ranking";

const strokeIcon = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
  focusable: "false",
} as const;

/**
 * A band with no movement set yet is drawn with the Maintien bars — the same
 * neutral default rankBandShades gives it for its color.
 */
export function RankMovementIcon({
  movement,
}: {
  movement: RankMovement | null;
}) {
  return (
    <svg className="ranking-icon" {...strokeIcon}>
      {movement === "promotion" ? (
        <path d="M12 19V5M5 12l7-7 7 7" />
      ) : movement === "relegation" ? (
        <path d="M12 5v14M5 12l7 7 7-7" />
      ) : (
        <path d="M5 9h14M5 15h14" />
      )}
    </svg>
  );
}

export function RankRewardIcon({ type }: { type: RankRewardType }) {
  return (
    <svg className="ranking-icon" {...strokeIcon}>
      {type === "sapphires" ? (
        <>
          <path d="M6 3h12l4 6-10 12L2 9z" />
          <path d="M2 9h20" />
        </>
      ) : type === "speedups" ? (
        <path d="M13 2L3 14h9l-1 8 10-12h-9z" />
      ) : (
        <path d="M12 2l8 10-8 10-8-10z" />
      )}
    </svg>
  );
}

export function LeagueLockIcon() {
  return (
    <svg className="ranking-icon" {...strokeIcon}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}
