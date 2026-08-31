"use client";

import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useLocaleChange } from "./use-locale-change";

const listboxId = "locale-listbox";

// Bloc 48/C: a native <select> lets the browser/OS decide whether its
// options open upward or downward, based on viewport space and which
// option is currently selected — with 5 languages this occasionally
// opened upward and forced an unwanted page scroll. Replaced by a custom
// ARIA listbox (WAI-ARIA "Collapsible Dropdown Listbox" pattern:
// button trigger + `role="listbox"` popup, arrow-key navigation,
// Enter/Space to select, Escape/Tab/click-outside to close) so the popup
// is always `position: absolute`, anchored below the trigger — the open
// direction is fully controlled here, never delegated to the browser.
// Scoped to the public LocaleToggle only — AdminLocaleToggle (2 plain
// buttons) and EditorialLocaleSelect (admin-only content picker) are
// unaffected.
export function LocaleToggle({ locales }: { locales: string[] }) {
  const t = useTranslations("common");
  const { locale, change, pending } = useLocaleChange(locales);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(locales.indexOf(locale), 0),
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (open) listboxRef.current?.focus();
  }, [open]);

  function openListbox() {
    setActiveIndex(Math.max(locales.indexOf(locale), 0));
    setOpen(true);
  }

  function closeListbox(refocusTrigger: boolean) {
    setOpen(false);
    if (refocusTrigger) triggerRef.current?.focus();
  }

  function selectOption(index: number) {
    const nextLocale = locales[index];
    closeListbox(true);
    if (nextLocale) change(nextLocale);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((current) => Math.min(current + 1, locales.length - 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((current) => Math.max(current - 1, 0));
        break;
      case "Home":
        event.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        event.preventDefault();
        setActiveIndex(locales.length - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        selectOption(activeIndex);
        break;
      case "Escape":
        event.preventDefault();
        closeListbox(true);
        break;
      case "Tab":
        closeListbox(false);
        break;
    }
  }

  return (
    <div className="locale-select" ref={containerRef}>
      <button
        type="button"
        ref={triggerRef}
        className="locale-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={t("language")}
        disabled={pending}
        onClick={() => (open ? closeListbox(false) : openListbox())}
      >
        {locale.toUpperCase()}
        <ChevronDown
          aria-hidden="true"
          size={14}
          className="locale-select-chevron"
        />
      </button>
      {open && (
        <ul
          id={listboxId}
          ref={listboxRef}
          role="listbox"
          className="locale-listbox"
          tabIndex={-1}
          aria-label={t("language")}
          aria-activedescendant={`locale-option-${locales[activeIndex]}`}
          onKeyDown={handleKeyDown}
        >
          {locales.map((availableLocale, index) => (
            <li
              key={availableLocale}
              id={`locale-option-${availableLocale}`}
              role="option"
              aria-selected={availableLocale === locale}
              className={
                index === activeIndex
                  ? "locale-listbox-option locale-listbox-option-active"
                  : "locale-listbox-option"
              }
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => selectOption(index)}
            >
              {availableLocale.toUpperCase()}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
