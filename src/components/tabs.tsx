"use client";

import type { ReactNode } from "react";
import { TabLabel } from "./tab-label";
import { handleTablistKeydown } from "./use-tablist-keyboard";

// Bloc 93/M1: the WAI-ARIA Tabs plumbing was written out by hand at 6 sites
// across 4 files — the same id pair, aria-controls/aria-labelledby, roving
// tabIndex and keydown handler each time. That is why Bloc 92/M2 had to wire
// the same relationship over and over, and why Bloc 93/F6 found one half of a
// pair missing its attributes. The id derivation lives here now, so a tab and
// its panel cannot drift apart.

export const tabId = (prefix: string, key: string) => `${prefix}-tab-${key}`;
export const tabPanelId = (prefix: string, key: string) =>
  `${prefix}-panel-${key}`;

type TabBase = {
  label: string;
  /** Defaults to available. An unavailable tab is disabled and badged. */
  available?: boolean;
  /** Badge + title shown when the tab is unavailable. */
  unavailableLabel?: string;
};

/**
 * A tab either owns a panel — and so its key must be one the caller can hold
 * as the active selection — or it is a Bloc 32/C placeholder for a tool with
 * no Calculator row yet: permanently disabled, no panel, never selectable.
 * Splitting the two keeps a placeholder's key out of the selection type, and
 * keeps a placeholder from claiming an aria-controls that resolves to nothing.
 */
export type TabDefinition<Key extends string> =
  | (TabBase & { key: Key; hasPanel?: true })
  | (TabBase & { key: string; hasPanel: false });

export function TabList<Key extends string>({
  idPrefix,
  label,
  tabs,
  active,
  onSelect,
  className = "calculator-tabs tabs",
  as = "nav",
}: {
  idPrefix: string;
  /** Names the tablist for assistive tech (WAI-ARIA requires one). */
  label: string;
  tabs: readonly TabDefinition<Key>[];
  active: Key | undefined;
  onSelect: (key: Key) => void;
  className?: string;
  /** "nav" for the page-level calculator tabs, "div" for an in-card switch. */
  as?: "nav" | "div";
}) {
  const Wrapper = as;
  return (
    <Wrapper
      className={className}
      role="tablist"
      aria-label={label}
      onKeyDown={handleTablistKeydown}
    >
      {tabs.map((tab) => {
        const available = tab.available ?? true;
        const badge = available ? undefined : tab.unavailableLabel;
        const hasPanel = tab.hasPanel ?? true;
        const selected = hasPanel && active === tab.key;
        const selectableKey = tab.key as Key;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            id={hasPanel ? tabId(idPrefix, tab.key) : undefined}
            aria-controls={hasPanel ? tabPanelId(idPrefix, tab.key) : undefined}
            aria-selected={selected}
            // Roving tabindex seeded from the selection; handleTablistKeydown
            // then moves the single tab stop to whatever the user focuses.
            // Disabled tabs are skipped by that handler and take no tab stop.
            tabIndex={hasPanel ? (selected ? 0 : -1) : undefined}
            disabled={!available}
            title={badge}
            onClick={hasPanel ? () => onSelect(selectableKey) : undefined}
          >
            <TabLabel label={tab.label} badge={badge} />
          </button>
        );
      })}
    </Wrapper>
  );
}

export function TabPanel({
  idPrefix,
  tabKey,
  children,
  className,
  ...rest
}: {
  idPrefix: string;
  /** The key of the tab this panel belongs to. */
  tabKey: string;
  children: ReactNode;
  className?: string;
} & Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "id" | "role" | "aria-labelledby" | "children" | "className"
>) {
  return (
    <div
      role="tabpanel"
      id={tabPanelId(idPrefix, tabKey)}
      aria-labelledby={tabId(idPrefix, tabKey)}
      // The panel itself is focusable so the Tab key reaches its content
      // straight from the selected tab.
      tabIndex={0}
      className={className}
      {...rest}
    >
      {children}
    </div>
  );
}
