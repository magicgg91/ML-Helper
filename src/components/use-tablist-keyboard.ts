import type { KeyboardEvent } from "react";

// Bloc 91/F5: the WAI-ARIA Tabs keyboard pattern. The calculator/reference
// tabs are role="tab" buttons in a role="tablist"; Tab and Enter/Space already
// worked, but the pattern also expects ArrowLeft/ArrowRight to move focus
// between tabs (wrapping around), and Home/End to jump to the first/last.
// Disabled tabs are skipped. Roving tabindex: only one tab is in the Tab order
// at a time, and — the point Codex raised (PR #115) — the tab stop follows
// FOCUS, not the current selection. The components seed tabIndex from
// aria-selected (correct on first render and after an activation re-renders),
// and this handler moves it to the newly focused tab as the user arrows, so
// tabbing out and back returns to the last-navigated tab. Activation stays
// manual — Enter/Space fire the button's onClick, matching click behaviour.
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
  const target = tabs[next];
  if (!target) return;
  event.preventDefault();
  // Move the single tab stop to the tab we're focusing (roving tabindex).
  for (const tab of tabs) tab.tabIndex = tab === target ? 0 : -1;
  target.focus();
}
