"use client";

import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

/**
 * Bloc 125 §3: the layer every admin popover opens into.
 *
 * Until here each one was an `absolute` box inside its own row, which made it
 * a prisoner of whatever clipped that row: the Événements colour picker was
 * invisible — all that showed was the sliver of it that fitted under the
 * swatch — and a ⋯ menu on the last row of a table was cut by the table's
 * own `overflow`. Rendering into `document.body` removes the question
 * entirely: nothing above it can clip what is no longer inside it.
 *
 * The portal wrapper carries `admin-shell`, which is where the admin's
 * palette, its z-index scale and its control resets live. Without it a
 * portalled menu would land in the middle of the public site's styles.
 */

export type PopoverPlacement =
  "bottom-start" | "bottom-end" | "top-start" | "top-end";

/** Between the anchor and the popover. */
const GUTTER = 6;
/** The least the popover may come to the edge of the window. */
const MARGIN = 8;

type Position = { left: number; top: number; placement: PopoverPlacement };

/**
 * Where the popover goes, in viewport coordinates, given where it would like
 * to be and how much room there actually is. Exported for its own test: this
 * is arithmetic, and arithmetic deserves to be checked without a browser.
 */
export function resolvePopoverPosition({
  anchor,
  popover,
  viewport,
  placement,
}: {
  anchor: { left: number; right: number; top: number; bottom: number };
  popover: { width: number; height: number };
  viewport: { width: number; height: number };
  placement: PopoverPlacement;
}): Position {
  const wantsTop = placement.startsWith("top");
  const wantsEnd = placement.endsWith("end");

  const below = anchor.bottom + GUTTER;
  const above = anchor.top - GUTTER - popover.height;
  // Flip only when the preferred side cannot hold it *and* the other side
  // can: on a window too short for either, flipping would just move the
  // problem, so the preferred side keeps it and the clamp below takes over.
  const fitsBelow = below + popover.height <= viewport.height - MARGIN;
  const fitsAbove = above >= MARGIN;
  const onTop = wantsTop ? !(!fitsAbove && fitsBelow) : !fitsBelow && fitsAbove;

  const fromStart = anchor.left;
  const fromEnd = anchor.right - popover.width;
  const startFits = fromStart + popover.width <= viewport.width - MARGIN;
  const endFits = fromEnd >= MARGIN;
  const onEnd = wantsEnd ? !(!endFits && startFits) : !startFits && endFits;

  const clamp = (value: number, max: number) =>
    Math.max(MARGIN, Math.min(value, max - MARGIN));

  return {
    left: clamp(onEnd ? fromEnd : fromStart, viewport.width - popover.width),
    top: clamp(onTop ? above : below, viewport.height - popover.height),
    placement: `${onTop ? "top" : "bottom"}-${onEnd ? "end" : "start"}`,
  };
}

export function AdminPopover({
  anchorRef,
  open,
  placement = "bottom-start",
  className,
  children,
  ...rest
}: {
  anchorRef: RefObject<HTMLElement | null>;
  open: boolean;
  placement?: PopoverPlacement;
  className?: string;
  children: ReactNode;
} & Omit<React.HTMLAttributes<HTMLDivElement>, "children">) {
  const [box, setBox] = useState<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<Position>();

  // Both in one callback ref rather than an effect: when the popover closes,
  // React hands this `null`, and dropping the position with the element is
  // what stops the next opening from being laid out, for one frame, where
  // the last one happened to be.
  const attach = useCallback((node: HTMLDivElement | null) => {
    setBox(node);
    if (!node) setPosition(undefined);
  }, []);

  const place = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor || !box) return;
    setPosition(
      resolvePopoverPosition({
        anchor: anchor.getBoundingClientRect(),
        popover: {
          width: box.offsetWidth,
          height: box.offsetHeight,
        },
        viewport: {
          width: document.documentElement.clientWidth,
          height: window.innerHeight,
        },
        placement,
      }),
    );
  }, [anchorRef, box, placement]);

  useEffect(() => {
    if (!open || !box) return;
    place();
    // A popover is anchored to something that moves: the page scrolls, a
    // pane scrolls inside it, the window is resized. `capture` catches the
    // scroll of any ancestor, not just the document's.
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, box, place]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="admin-shell">
      <div
        ref={attach}
        data-placement={position?.placement}
        style={{
          position: "fixed",
          left: position?.left ?? 0,
          top: position?.top ?? 0,
          // It has to be laid out to be measured, and showing it at the
          // origin for that one frame would be a visible jump — so it is
          // transparent until it is placed, not hidden. `visibility: hidden`
          // was the first thing tried and it broke the keyboard: focus()
          // does nothing on a hidden element, so the menu never took the
          // focus and Escape went to the trigger instead of closing it.
          opacity: position ? 1 : 0,
          pointerEvents: position ? undefined : "none",
        }}
        className={cn("z-[var(--z-popover)]", className)}
        {...rest}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
