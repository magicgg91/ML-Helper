// Bloc 33/N: a disabled/not-yet-implemented tab must say so permanently,
// not only via a hover title — invisible on touch devices and easy to
// miss even with a pointer. Reuses whichever message the caller already
// shows as the tooltip (comingSoon or calculator-unavailable) so the two
// stay in sync.
export function TabLabel({ label, badge }: { label: string; badge?: string }) {
  if (!badge) return <>{label}</>;
  return (
    <>
      {label}
      <small className="tab-coming-soon"> {badge}</small>
    </>
  );
}
