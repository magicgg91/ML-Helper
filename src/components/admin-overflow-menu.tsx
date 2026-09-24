"use client";

import { MoreHorizontalIcon } from "lucide-react";
import Link from "next/link";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

/**
 * Bloc 119: the ⋯ menu that collects a row's secondary actions.
 *
 * It exists to get the destructive ones off the row: the guides list used to
 * carry a full-width red Delete button per line, one mis-click away from
 * losing a guide. Rare actions move in here, the everyday one (Modifier)
 * stays out in the open.
 *
 * Keyboard behaviour follows the WAI-ARIA menu button pattern, like
 * handleTablistKeydown does for tabs: arrows move between items, Home/End
 * jump to the ends, Escape closes and hands focus back to the trigger.
 */

export type OverflowMenuItem = {
  key: string;
  label: string;
  /** An action… */
  onSelect?: () => void;
  /** …or a link. A "Voir sur le site" entry is a real anchor, not a click. */
  href?: string;
  tone?: "default" | "danger";
  disabled?: boolean;
  /** Bloc 125 §2: the icon a menu entry carries, when its menu shows icons. */
  icon?: ReactNode;
  /** A rule above this entry — what separates "Mon compte" from the way out. */
  separatorBefore?: boolean;
};

export function OverflowMenu({
  label,
  items,
  trigger,
  triggerClassName,
  placement = "bottom-end",
}: {
  /** Names the menu: "Autres actions pour Guide des ligues". */
  label: string;
  items: readonly OverflowMenuItem[];
  /**
   * Bloc 125 §2: what the button shows. The ⋯ glyph when left out, which is
   * every row menu; the account block passes its own avatar-and-name.
   */
  trigger?: ReactNode;
  /** Replaces the ⋯ button's own box when the trigger is not a glyph. */
  triggerClassName?: string;
  /**
   * Where the menu opens. `top-start` is what the account block needs — it
   * sits at the very bottom of the column, and a menu below it would open
   * off-screen.
   */
  placement?: "bottom-end" | "top-start";
}) {
  const triggerId = useId();
  const menuId = useId();
  const container = useRef<HTMLDivElement | null>(null);
  const menu = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  // Which end to land on once the menu is on screen: a click starts at the
  // top, ArrowUp on the trigger starts at the bottom.
  const [entryPoint, setEntryPoint] = useState<"first" | "last">("first");

  const entries = () => [
    ...(menu.current?.querySelectorAll<HTMLElement>(
      '[role="menuitem"]:not([disabled])',
    ) ?? []),
  ];

  useEffect(() => {
    if (!open) return;
    const focusable = entries();
    (entryPoint === "first"
      ? focusable[0]
      : focusable[focusable.length - 1]
    )?.focus();
  }, [open, entryPoint]);

  useEffect(() => {
    if (!open) return;
    // A click anywhere else — including on another row's ⋯ — closes this one.
    // pointerdown rather than click, so the menu is gone before the other
    // trigger acts on its own event.
    function onPointerDown(event: PointerEvent) {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function close({ restoreFocus }: { restoreFocus: boolean }) {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }

  function openAt(end: "first" | "last") {
    setEntryPoint(end);
    setOpen(true);
  }

  function onTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    openAt(event.key === "ArrowDown" ? "first" : "last");
  }

  function onMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      close({ restoreFocus: true });
      return;
    }
    if (event.key === "Tab") {
      // Leaving the menu with Tab closes it rather than leaving an orphan
      // popup open behind the moving focus.
      close({ restoreFocus: false });
      return;
    }
    const moves = ["ArrowDown", "ArrowUp", "Home", "End"];
    if (!moves.includes(event.key)) return;
    const focusable = entries();
    if (focusable.length === 0) return;
    const current = focusable.indexOf(document.activeElement as HTMLElement);
    const next =
      event.key === "ArrowDown"
        ? current === focusable.length - 1
          ? 0
          : current + 1
        : event.key === "ArrowUp"
          ? current <= 0
            ? focusable.length - 1
            : current - 1
          : event.key === "Home"
            ? 0
            : focusable.length - 1;
    event.preventDefault();
    focusable[next]?.focus();
  }

  const itemClasses = (item: OverflowMenuItem) =>
    cn(
      "admin-focus flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm whitespace-nowrap [&_svg]:size-4 [&_svg]:shrink-0",
      item.separatorBefore && "mt-1 border-t border-admin-rule-soft pt-2",
      item.tone === "danger" ? "text-admin-danger-ink" : "text-admin-text",
      item.disabled
        ? "cursor-not-allowed opacity-50"
        : "hover:bg-admin-accent-soft hover:text-admin-accent-soft-ink",
    );

  return (
    <div className="relative inline-block" ref={container}>
      <button
        id={triggerId}
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={label}
        onClick={() => (open ? close({ restoreFocus: true }) : openAt("first"))}
        onKeyDown={onTriggerKeyDown}
        className={
          triggerClassName ??
          "admin-focus inline-flex size-[var(--admin-control-h-sm)] cursor-pointer items-center justify-center rounded-admin-control border border-admin-card-border bg-admin-card text-admin-dim hover:text-admin-text"
        }
      >
        {trigger ?? (
          <MoreHorizontalIcon aria-hidden="true" className="size-4" />
        )}
      </button>
      {open && (
        <div
          id={menuId}
          ref={menu}
          role="menu"
          aria-labelledby={triggerId}
          onKeyDown={onMenuKeyDown}
          className={cn(
            "absolute z-20 min-w-48 rounded-admin-control border border-admin-card-border bg-admin-card py-1 shadow-lg",
            placement === "bottom-end" && "right-0 mt-1",
            // Anchored to the top of the trigger and growing upwards, so a
            // menu at the very bottom of the column opens into the page
            // rather than under it.
            placement === "top-start" && "bottom-full left-0 mb-1",
          )}
        >
          {items.map((item) =>
            item.href !== undefined && !item.disabled ? (
              <Link
                key={item.key}
                role="menuitem"
                tabIndex={-1}
                href={item.href}
                onClick={() => close({ restoreFocus: false })}
                className={itemClasses(item)}
              >
                {item.icon}
                {item.label}
              </Link>
            ) : (
              <button
                key={item.key}
                type="button"
                role="menuitem"
                tabIndex={-1}
                disabled={item.disabled}
                onClick={() => {
                  close({ restoreFocus: true });
                  item.onSelect?.();
                }}
                className={itemClasses(item)}
              >
                {item.icon}
                {item.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}
