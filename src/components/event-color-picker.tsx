"use client";

import { useEffect, useRef, useState } from "react";
import { eventColors, eventColorVar, type EventColor } from "@/lib/events";

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

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  return (
    <div className="events-color-picker" ref={containerRef}>
      <button
        type="button"
        className="events-color-picker-toggle"
        style={{ background: eventColorVar(value) }}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={label}
        data-testid={testId}
        onClick={() => setOpen((current) => !current)}
      />
      {open && (
        <div
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
                setOpen(false);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
