// Bloc 33/N: a disabled/not-yet-implemented tab must say so permanently,
// not only via a hover title — invisible on touch devices and easy to
// miss even with a pointer. Reuses whichever message the caller already
// shows as the tooltip (comingSoon or calculator-unavailable) so the two
// stay in sync.

/**
 * How the badge is drawn.
 *
 * Bloc 114/A.1: "pill" is for a tool that does not exist yet — a short word
 * on a filled chip. "asterisk" stays the default for a tool that exists and
 * an admin has switched off, whose message is a sentence rather than a word
 * and which reads as a warning, not as a promise.
 */
export type TabBadgeStyle = "asterisk" | "pill";

export function TabLabel({
  label,
  badge,
  badgeStyle = "asterisk",
}: {
  label: string;
  badge?: string;
  badgeStyle?: TabBadgeStyle;
}) {
  if (!badge) return <>{label}</>;
  if (badgeStyle === "pill")
    return (
      <>
        {label}
        <small className="tab-soon-pill">{badge}</small>
      </>
    );
  return (
    <>
      {label}
      <small className="tab-coming-soon"> {badge}</small>
    </>
  );
}
