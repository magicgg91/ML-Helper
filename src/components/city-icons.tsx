/**
 * Bloc 113: the line icons of the Villes tool's tiles.
 *
 * They replace the 💰/⚔️ emoji the headings used to carry: an emoji is a
 * different glyph on every platform, is read aloud by screen readers, and
 * cannot take the tile's own color. These are stroke SVG on currentColor,
 * decorative, and sized by the tile.
 */

import { strokeIcon } from "./icon-base";

/** Coût, Or/h — a stack of coins. */
export function CoinsIcon() {
  return (
    <svg className="tool-icon" {...strokeIcon}>
      <ellipse cx="12" cy="6" rx="7" ry="3" />
      <path d="M5 6v5c0 1.66 3.13 3 7 3s7-1.34 7-3V6" />
      <path d="M5 11v5c0 1.66 3.13 3 7 3s7-1.34 7-3v-5" />
    </svg>
  );
}

/** Armée/h — crossed swords. */
export function SwordsIcon() {
  return (
    <svg className="tool-icon" {...strokeIcon}>
      <path d="M4 3h3l11 11v3h-3L4 6z" />
      <path d="M20 3h-3L6 14v3h3L20 6z" />
    </svg>
  );
}

/** VP — a trophy. */
export function TrophyIcon() {
  return (
    <svg className="tool-icon" {...strokeIcon}>
      <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
      <path d="M7 6H4v1a3 3 0 0 0 3 3" />
      <path d="M17 6h3v1a3 3 0 0 1-3 3" />
      <path d="M10 14h4v3h-4z" />
      <path d="M8 20h8" />
      <path d="M10 17v3" />
      <path d="M14 17v3" />
    </svg>
  );
}

/** Niveau max — a rising staircase with an arrow. */
export function StairsUpIcon() {
  return (
    <svg className="tool-icon" {...strokeIcon}>
      <path d="M3 20h4v-4h4v-4h4V8h4" />
      <path d="M15 4h5v5" />
      <path d="M20 4l-6 6" />
    </svg>
  );
}

/** Or restant — a purse. */
export function PurseIcon() {
  return (
    <svg className="tool-icon" {...strokeIcon}>
      <path d="M9 3h6l-1.5 4h-3z" />
      <path d="M12.5 7c4 0 7.5 3.6 7.5 7.5S17 21 12 21s-8-2.6-8-6.5S8.5 7 12.5 7z" />
      <path d="M12 11v6" />
      <path d="M14 12.5h-3a1.5 1.5 0 0 0 0 3h2a1.5 1.5 0 0 1 0 3h-3" />
    </svg>
  );
}

/** Bonus — a treasure chest. */
export function ChestIcon() {
  return (
    <svg className="tool-icon" {...strokeIcon}>
      <path d="M3 10a9 9 0 0 1 18 0" />
      <rect x="3" y="10" width="18" height="9" rx="2" />
      <path d="M3 14h18" />
      <path d="M10 14h4v3h-4z" />
    </svg>
  );
}
