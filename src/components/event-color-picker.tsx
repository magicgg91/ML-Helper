"use client";

import { useEffect, useRef, useState } from "react";
import { eventColors, eventColorVar, type EventColor } from "@/lib/events";
import { AdminPopover } from "./admin-popover";

/**
 * Bloc 80/F: a dedicated button per event, opening a fixed ~10-colour palette
 * (eventColors) rather than a colour field's free-form value — so two similar
 * events (cdc example: "Architecte" 72h then 24h) can share a colour on
 * purpose instead of relying on their names hashing the same way.
 *
 * Same WAI-ARIA "button trigger + popup" shape as LocaleToggle's own custom
 * listbox (locale-toggle.tsx, Bloc 48/C), simplified to a swatch grid
 * (role="group" of toggle buttons): there is no linear list to keyboard
 * navigate here, just a pick-one-of-many grid.
 *
 * Bloc 119: lifted out of the Événements editor unchanged when that screen
 * was rewritten — the brief asks for the existing picker, not a new one.
 *
 * Bloc 125 §3: the swatch grid was an `absolute` box inside the event row,
 * and the row clipped it — all that ever showed was the sliver of it that
 * fitted under the swatch. It opens in a portal now, on the popover step of
 * the z-index scale, and it gives the focus back to the swatch on the way
 * out. Which colours it offers, and what picking one does, are untouched.
 */
export function EventColorPicker({
  value,
  onChange,
  label,
  swatchLabel,
  testId,
}: {
  value: EventColor;
  onChange: (color: EventColor) => void;
  label: string;
  swatchLabel: (color: EventColor) => string;
  testId: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  /** Closes, and puts the focus back where it came from. */
  function close({ restoreFocus }: { restoreFocus: boolean }) {
    setOpen(false);
    if (restoreFocus) toggleRef.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      // The grid is in a portal, so it is no longer a descendant of the
      // container: a click in it would otherwise read as a click outside.
      if (containerRef.current?.contains(target)) return;
      if (optionsRef.current?.contains(target)) return;
      setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        close({ restoreFocus: true });
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="events-color-picker" ref={containerRef}>
      <button
        type="button"
        ref={toggleRef}
        className="events-color-picker-toggle"
        style={{ background: eventColorVar(value) }}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={label}
        data-testid={testId}
        onClick={() => setOpen((current) => !current)}
      />
      <AdminPopover anchorRef={toggleRef} open={open} placement="bottom-start">
        <div
          ref={optionsRef}
          className="events-color-picker-options"
          role="group"
          aria-label={label}
        >
          {eventColors.map((color) => (
            <button
              key={color}
              type="button"
              className="events-color-picker-option"
              style={{ background: eventColorVar(color) }}
              aria-pressed={value === color}
              aria-label={swatchLabel(color)}
              data-testid={`${testId}-${color}`}
              onClick={() => {
                onChange(color);
                close({ restoreFocus: true });
              }}
            />
          ))}
        </div>
      </AdminPopover>
    </div>
  );
}
