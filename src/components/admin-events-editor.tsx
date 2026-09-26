"use client";

import { ChevronRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  emptyEventRow,
  emptyEventTierRow,
  eventDurations,
  maxSeasonDurationDays,
  totalEventHours,
  type EventColor,
  type EventRow,
  type EventsCatalog,
  type EventTierRow,
} from "@/lib/events";
import { leagues, type League } from "@/lib/player-settings";
import { contentPairLocales, type ContentPairLocale } from "@/lib/translations";
import { cn } from "@/lib/utils";
import { AdminButton } from "./admin-button";
import { EditorHeader } from "./admin-editor-header";
import { EditorSection } from "./admin-editor-section";
import { adminLeagueChipClass } from "./admin-league-chip";
import { LangTabs } from "./admin-lang-tabs";
import { NumberField } from "./admin-number-field";
import { Pill } from "./admin-pill";
import { RowActions } from "./admin-row-actions";
import type { EditorScreenProps } from "./admin-tool-editors";
import { AdminSegmented } from "./admin-segmented";
import { EventColorPicker } from "./event-color-picker";
import { useEditorForm } from "./use-editor-form";

/**
 * Bloc 119 §3 bis: the Événements reference.
 *
 * Every event used to be a card of stacked labelled fields, tiers included,
 * so a league with eight events was a very long page of identical blocks. An
 * event is now one line — colour, name, description, duration, how many tiers
 * — and its tiers appear underneath only when it is unfolded.
 *
 * Bloc 60 review: only fr/en are captured per event and per tier, so any
 * other editorial language edits the EN fields, matching the public table's
 * own fallback.
 */

export function EventsReferenceEditor({
  initialCatalog,
  backHref,
  backLabel,
  title,
}: EditorScreenProps & { initialCatalog: EventsCatalog }) {
  const t = useTranslations("admin.references");
  const common = useTranslations("common");
  const gameLeagues = useTranslations("game.leagues");
  const languageNames = useTranslations("admin.config.languages");
  const [league, setLeague] = useState<League>("bronze");
  const [locale, setLocale] = useState<ContentPairLocale>("fr");
  const [open, setOpen] = useState<Set<number>>(new Set());

  const form = useEditorForm<EventsCatalog>({
    initial: initialCatalog,
    endpoint: "/api/admin/guides/references/events",
    validate: (catalog) => {
      const lang = locale;
      for (const key of leagues) {
        const data = catalog[key];
        for (const event of data.events) {
          if (!event.name.trim()) return t("required");
          for (const tier of event.tiers)
            if (
              !tier[`objective_${lang}`].trim() ||
              !tier[`reward_${lang}`].trim()
            )
              return t("required");
        }
        // Bloc 77 review: events chain back-to-back, so a league whose events
        // add up to more than its own season would overflow the public
        // timeline. The save is refused rather than the timeline broken.
        // Named by league: the screen shows one league at a time, so a save
        // refused because of another one has to say which.
        if (totalEventHours(data.events) > data.seasonDurationDays * 24)
          return t("events-season-overrun-of", {
            league: gameLeagues(key),
            total: common("duration-hours", {
              hours: totalEventHours(data.events),
            }),
            season: common("duration-hours", {
              hours: data.seasonDurationDays * 24,
            }),
          });
      }
      return undefined;
    },
  });
  const catalog = form.value;
  const data = catalog[league];
  const events = data.events;

  const lang = locale;
  const descriptionKey = `description_${lang}` as const;
  const objectiveKey = `objective_${lang}` as const;
  const rewardKey = `reward_${lang}` as const;

  const setEvents = (next: EventRow[]) =>
    form.setValue((current) => ({
      ...current,
      [league]: { ...current[league], events: next },
    }));

  const patchEvent = (index: number, patch: Partial<EventRow>) =>
    setEvents(
      events.map((event, i) => (i === index ? { ...event, ...patch } : event)),
    );

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= events.length) return;
    const next = [...events];
    [next[index], next[target]] = [next[target], next[index]];
    setEvents(next);
  }

  const setTiers = (index: number, tiers: EventTierRow[]) =>
    patchEvent(index, { tiers });

  function moveTier(index: number, tierIndex: number, direction: -1 | 1) {
    const tiers = events[index].tiers;
    const target = tierIndex + direction;
    if (target < 0 || target >= tiers.length) return;
    const next = [...tiers];
    [next[tierIndex], next[target]] = [next[target], next[tierIndex]];
    setTiers(index, next);
  }

  const overruns = totalEventHours(events) > data.seasonDurationDays * 24;

  return (
    <div className="flex flex-col gap-6">
      <EditorHeader
        backHref={backHref}
        backLabel={backLabel}
        title={title}
        dirty={form.dirty}
        saving={form.saving}
        onSave={form.save}
        onCancel={form.cancel}
        message={form.message}
      />

      <EditorSection
        title={t("events-season-title")}
        actions={
          <LangTabs
            locales={contentPairLocales}
            locale={locale}
            onChange={setLocale}
            label={t("texts-in")}
            filled={(code) =>
              leagues.some((key) =>
                catalog[key].events.some((event) =>
                  event[`description_${code}`].trim(),
                ),
              )
            }
            languageNames={Object.fromEntries(
              contentPairLocales.map((code) => [
                code,
                languageNames.has(code)
                  ? languageNames(code)
                  : code.toUpperCase(),
              ]),
            )}
          />
        }
      >
        <div className="flex flex-wrap items-end gap-6">
          <div className="flex flex-col gap-1">
            <span className="admin-eyebrow text-admin-dim" id="events-league">
              {t("events-league-label")}
            </span>
            <div
              aria-labelledby="events-league"
              className="flex flex-wrap gap-1"
              role="radiogroup"
            >
              {leagues.map((key) => (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={key === league}
                  // Bloc 138/C : le style que cet écran portait, désormais lu
                  // depuis un seul endroit — le Classement rend la même classe.
                  className={adminLeagueChipClass(key === league)}
                  onClick={() => {
                    setLeague(key);
                    setOpen(new Set());
                  }}
                >
                  {gameLeagues(key)}
                </button>
              ))}
            </div>
          </div>
          {/* Bloc 77/C: admin-editable per league, never hardcoded — it is
              the denominator the public timeline sizes every segment with. */}
          <NumberField
            label={t("events-season-duration-label")}
            width="s"
            value={data.seasonDurationDays}
            onChange={(next) =>
              form.setValue((current) => ({
                ...current,
                [league]: {
                  ...current[league],
                  seasonDurationDays: Math.min(
                    maxSeasonDurationDays,
                    Math.max(1, Math.round(next ?? 1)),
                  ),
                },
              }))
            }
          />
          <Pill tone={overruns ? "warn" : "neutral"}>
            {common("duration-hours", { hours: totalEventHours(events) })}
          </Pill>
        </div>
        {overruns && (
          <p className="text-sm text-admin-danger-ink" role="status">
            {t("events-season-overrun", {
              total: common("duration-hours", {
                hours: totalEventHours(events),
              }),
              season: common("duration-hours", {
                hours: data.seasonDurationDays * 24,
              }),
            })}
          </p>
        )}
      </EditorSection>

      <EditorSection
        title={t("events-of-league", { league: gameLeagues(league) })}
        actions={
          <AdminButton
            type="button"
            size="sm"
            data-testid={`add-event-${league}`}
            onClick={() => {
              setEvents([...events, { ...emptyEventRow, tiers: [] }]);
              setOpen((current) => new Set(current).add(events.length));
            }}
          >
            {t("add-event")}
          </AdminButton>
        }
      >
        {events.length === 0 ? (
          <p className="text-sm text-admin-dim">{t("empty")}</p>
        ) : (
          <div className="-mx-6 -mb-6 flex flex-col">
            {events.map((event, index) => {
              const rowLabel = (field: string) =>
                t("event-row-label", { row: index + 1, field });
              const expanded = open.has(index);
              const panelId = `${league}-event-${index}`;
              return (
                // Bloc 125 §6: a row, not a framed card. The name used to be
                // printed twice — once as the card's serif title and once in
                // its own field — and a stack of ten bordered boxes read as
                // ten screens rather than one list.
                <div
                  key={index}
                  className={cn(
                    "border-b border-admin-rule-soft last:border-0",
                    expanded && "bg-admin-row-open",
                  )}
                >
                  <div className="grid items-center gap-3 px-5 py-3 xl:grid-cols-[32px_14px_200px_minmax(0,1fr)_150px_110px_100px]">
                    <button
                      type="button"
                      aria-expanded={expanded}
                      aria-controls={panelId}
                      aria-label={rowLabel(
                        t("events-tiers-summary", {
                          count: event.tiers.length,
                        }),
                      )}
                      className="admin-focus flex size-8 items-center justify-center rounded-admin-control text-admin-dim hover:bg-admin-hover hover:text-admin-text"
                      onClick={() =>
                        setOpen((current) => {
                          const updated = new Set(current);
                          if (expanded) updated.delete(index);
                          else updated.add(index);
                          return updated;
                        })
                      }
                    >
                      <ChevronRightIcon
                        aria-hidden="true"
                        className={cn(
                          "size-4 transition-transform",
                          expanded && "rotate-90",
                        )}
                      />
                    </button>
                    <EventColorPicker
                      value={event.color}
                      label={rowLabel(t("events-columns.color"))}
                      swatchLabel={(color) => t(`event-colors.${color}`)}
                      testId={`event-color-${league}-${index}`}
                      compact
                      onChange={(color: EventColor) =>
                        patchEvent(index, { color })
                      }
                    />
                    <input
                      aria-label={rowLabel(t("events-columns.name"))}
                      className="admin-control admin-focus h-9 w-full rounded-admin-control border border-admin-card-border bg-admin-card px-2 text-sm text-admin-text"
                      type="text"
                      value={event.name}
                      onChange={(e) =>
                        patchEvent(index, { name: e.target.value })
                      }
                    />
                    <input
                      aria-label={rowLabel(t("events-columns.description"))}
                      className={cn(
                        "admin-control admin-focus h-9 w-full min-w-0 rounded-admin-control border bg-admin-card px-2 text-sm text-admin-text",
                        event[descriptionKey].trim()
                          ? "border-admin-card-border"
                          : "border-dashed border-admin-warn-ink/60",
                      )}
                      placeholder={t("description-to-write")}
                      type="text"
                      value={event[descriptionKey]}
                      onChange={(e) =>
                        patchEvent(index, {
                          [descriptionKey]: e.target.value,
                        })
                      }
                    />
                    {/* The same segmented control as the sidebar's language
                        pair (§2): three loose buttons did not say that
                        picking one unpicks the others. */}
                    <AdminSegmented
                      options={eventDurations}
                      value={event.duration}
                      label={rowLabel(t("events-columns.duration"))}
                      optionLabel={(duration) =>
                        common("duration-hours", { hours: duration })
                      }
                      onChange={(duration) => patchEvent(index, { duration })}
                    />
                    <Pill tone="neutral">
                      {t("tier-count", { count: event.tiers.length })}
                    </Pill>
                    <div className="flex justify-end">
                      <RowActions
                        name={event.name || t("event-unnamed")}
                        isFirst={index === 0}
                        isLast={index === events.length - 1}
                        onMoveUp={() => move(index, -1)}
                        onMoveDown={() => move(index, 1)}
                        onRemove={() =>
                          setEvents(events.filter((_, i) => i !== index))
                        }
                      />
                    </div>
                  </div>
                  <div hidden={!expanded} id={panelId}>
                    {/* Indented under the row it belongs to: the tiers of an
                        event are inside it, and at the same left edge they
                        read as a second list of events. */}
                    <div className="flex flex-col gap-3 pt-1 pr-5 pb-4 pl-16">
                      {event.tiers.length === 0 ? (
                        <p className="text-sm text-admin-dim">
                          {t("tiers-empty")}
                        </p>
                      ) : (
                        <table className="w-full border-collapse text-sm">
                          <caption className="sr-only">
                            {t("events-tiers-summary", {
                              count: event.tiers.length,
                            })}
                          </caption>
                          <thead>
                            <tr className="border-b border-admin-rule">
                              <th className="admin-column-head px-2 py-1 text-left text-admin-dim">
                                #
                              </th>
                              <th className="admin-column-head px-2 py-1 text-left text-admin-dim">
                                {t("tier-columns.objective")}
                              </th>
                              <th className="admin-column-head px-2 py-1 text-left text-admin-dim">
                                {t("tier-columns.reward")}
                              </th>
                              <th className="admin-column-head px-2 py-1 text-right text-admin-dim">
                                {t("actions")}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {event.tiers.map((tier, tierIndex) => (
                              <tr
                                key={tierIndex}
                                className="border-b border-admin-rule-soft last:border-0"
                              >
                                <td className="px-2 py-1 text-admin-dim">
                                  {tierIndex + 1}
                                </td>
                                {(
                                  [
                                    [objectiveKey, "objective"],
                                    [rewardKey, "reward"],
                                  ] as const
                                ).map(([key, column]) => (
                                  <td key={column} className="px-2 py-1">
                                    <input
                                      aria-label={t("tier-row-label", {
                                        event: event.name || t("event-unnamed"),
                                        row: tierIndex + 1,
                                        field: t(`tier-columns.${column}`),
                                      })}
                                      className="admin-control admin-focus h-9 w-full rounded-admin-control border border-admin-card-border bg-admin-card px-2 text-sm text-admin-text"
                                      type="text"
                                      value={tier[key]}
                                      onChange={(e) =>
                                        setTiers(
                                          index,
                                          event.tiers.map((item, i) =>
                                            i === tierIndex
                                              ? {
                                                  ...item,
                                                  [key]: e.target.value,
                                                }
                                              : item,
                                          ),
                                        )
                                      }
                                    />
                                  </td>
                                ))}
                                <td className="px-2 py-1">
                                  <RowActions
                                    // The tier, not one of its fields: reusing
                                    // a field's label would make "Monter
                                    // Objectif du palier 1" collide with the
                                    // Objectif field itself.
                                    name={t("tier-name", {
                                      event: event.name || t("event-unnamed"),
                                      row: tierIndex + 1,
                                    })}
                                    isFirst={tierIndex === 0}
                                    isLast={
                                      tierIndex === event.tiers.length - 1
                                    }
                                    onMoveUp={() =>
                                      moveTier(index, tierIndex, -1)
                                    }
                                    onMoveDown={() =>
                                      moveTier(index, tierIndex, 1)
                                    }
                                    onRemove={() =>
                                      setTiers(
                                        index,
                                        event.tiers.filter(
                                          (_, i) => i !== tierIndex,
                                        ),
                                      )
                                    }
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                      <AdminButton
                        type="button"
                        size="sm"
                        className="self-start"
                        data-testid={`add-tier-${league}-${index}`}
                        onClick={() =>
                          setTiers(index, [
                            ...event.tiers,
                            { ...emptyEventTierRow },
                          ])
                        }
                      >
                        {t("add-tier")}
                      </AdminButton>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </EditorSection>
    </div>
  );
}
