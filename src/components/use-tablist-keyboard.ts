import type { KeyboardEvent } from "react";

// Bloc 91/F5: the WAI-ARIA Tabs keyboard pattern. The calculator/reference
// tabs are role="tab" buttons in a role="tablist"; Tab and Enter/Space already
// worked, but the pattern also expects ArrowLeft/ArrowRight to move focus
// between tabs (wrapping around), and Home/End to jump to the first/last.
// Disabled tabs are skipped. Pair this with roving tabindex on the tabs (the
// selected tab is tabIndex 0, the rest -1) so Tab lands on the tablist once and
// the arrows take over from there. Activation stays manual — Enter/Space fire
// the button's onClick, matching the existing click behaviour.
export function handleTablistKeydown(event: KeyboardEvent<HTMLElement>): void {
  const moves = ["ArrowLeft", "ArrowRight", "Home", "End"];
  if (!moves.includes(event.key)) return;
  const tabs = Array.from(
    event.currentTarget.querySelectorAll<HTMLButtonElement>(
      '[role="tab"]:not([disabled])',
    ),
  );
  if (tabs.length === 0) return;
  const current = tabs.indexOf(document.activeElement as HTMLButtonElement);
  let next: number;
  switch (event.key) {
    case "ArrowLeft":
      next = current <= 0 ? tabs.length - 1 : current - 1;
      break;
    case "ArrowRight":
      next = current === tabs.length - 1 ? 0 : current + 1;
      break;
    case "Home":
      next = 0;
      break;
    default:
      next = tabs.length - 1;
  }
  event.preventDefault();
  tabs[next]?.focus();
}
