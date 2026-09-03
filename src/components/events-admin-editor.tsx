"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import {
  EditableDataTable,
  errorKey,
  type EditableColumn,
  type FieldErrors,
} from "./editable-reference-table";
import { EditorActionBar } from "./editor-action-bar";
import { LeagueButtons } from "./league-select";
import {
  EditorialLocaleSelect,
  type EditorialLocale,
} from "./editorial-locale-select";
import {
  emptyEventRow,
  emptyEventTierRow,
  eventColors,
  eventColorVar,
  eventDurations,
  maxSeasonDurationDays,
  totalEventHours,
  type EventColor,
  type EventDuration,
  type EventRow,
  type EventsCatalog,
  type EventTierRow,
} from "../lib/events";
import { leagues, type League } from "../lib/player-settings";

// Bloc 60 review (Codex PR #81): same editorial-locale toggle as
// Consommables (Bloc 48/A) — only fr/en are actually captured per tier, so
// any non-fr editorial locale edits the EN fields, matching the public
// table's own non-fr fallback to English (Bloc44-review/C).
function fieldLocale(locale: EditorialLocale): "fr" | "en" {
  return locale === "fr" ? "fr" : "en";
}

// Bloc 60: per-event validation errors — "name" is a single message (the
// event's own free-text fields are a small custom form, not an
// EditableDataTable), "tiers" is the flat FieldErrors map EditableDataTable
// expects for that event's nested tier table.
type EventValidation = { name?: string; tiers: FieldErrors };
type CatalogErrors = Record<League, EventValidation[]>;

function emptyCatalogErrors(): CatalogErrors {
  return Object.fromEntries(
    leagues.map((league) => [league, [] as EventValidation[]]),
  ) as CatalogErrors;
}

const tierColumns = (
  t: (key: string) => string,
  lang: "fr" | "en",
  inputLabel: (index: number, field: string) => string,
): EditableColumn<EventTierRow>[] => {
  const objectiveKey = lang === "fr" ? "objective_fr" : "objective_en";
  const rewardKey = lang === "fr" ? "reward_fr" : "reward_en";
  return [
    {
      key: objectiveKey,
      label: t("tier-columns.objective"),
      required: true,
      inputLabel: (index) => inputLabel(index, t("tier-columns.objective")),
    },
    {
      key: rewardKey,
      label: t("tier-columns.reward"),
      required: true,
      // Bloc 80/E: 3x the base field width — same .events-tiers-table
      // .reference-admin-wide scoping as Bloc 79/C's Description field,
      // Récompense only (Objectif keeps the plain default width).
      wide: true,
      inputLabel: (index) => inputLabel(index, t("tier-columns.reward")),
    },
  ] as EditableColumn<EventTierRow>[];
};

// Bloc 80/F: a dedicated button per event, opening a fixed ~10-color
// palette (eventColors) instead of a color field's free-form value — same
// WAI-ARIA "button trigger + popup" shape as LocaleToggle's own custom
// listbox (locale-toggle.tsx, Bloc 48/C), simplified to a swatch grid
// (role="group" of toggle buttons) since there's no linear list to
// keyboard-navigate here, just a pick-one-of-many grid.
function EventColorPicker({
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

// Bloc 60: the "Événements" reference — a 3rd reference-catalog level
// (league -> events -> tiers) on top of the same building blocks every
// other reference already uses: LeagueButtons (Bloc 61) for the league
// switch, and EditableDataTable reused as-is for each event's nested tier
// list (add/remove/reorder, red-X confirm) — same pattern as Boutique's 4
// category tables (Bloc 46/49), just one level deeper. The outer events
// list can't reuse EditableDataTable directly (a table row can't host a
// collapsible nested table), so it's a custom card list with the same
// icon-based add/remove/reorder controls.
// Bloc 77: a league's data is now { seasonDurationDays, events } instead of
// a bare event array — the season length is admin-editable per league
// (never hardcoded) since Bloc 77/D's timeline visual uses it as the
// denominator for every event's proportional segment width.
export function EventsReferenceScreen({
  initialCatalog,
}: {
  initialCatalog: EventsCatalog;
}) {
  const t = useTranslations("admin.references");
  const common = useTranslations("common");
  const [league, setLeague] = useState<League>(leagues[0]);
  const [locale, setLocale] = useState<EditorialLocale>("fr");
  const [catalog, setCatalog] = useState<EventsCatalog>(initialCatalog);
  const [errors, setErrors] = useState<CatalogErrors>(emptyCatalogErrors);
  const [seasonOverruns, setSeasonOverruns] = useState<Record<League, boolean>>(
    () => Object.fromEntries(leagues.map((l) => [l, false])) as Record<
      League,
      boolean
    >,
  );
  const [status, setStatus] = useState("");

  const lang = fieldLocale(locale);
  const objectiveKey = lang === "fr" ? "objective_fr" : "objective_en";
  const rewardKey = lang === "fr" ? "reward_fr" : "reward_en";
  const descriptionKey = lang === "fr" ? "description_fr" : "description_en";
  const leagueData = catalog[league];
  const events = leagueData.events;
  const leagueErrors = errors[league];

  function updateEvents(nextEvents: EventRow[]) {
    setCatalog((current) => ({
      ...current,
      [league]: { ...current[league], events: nextEvents },
    }));
  }

  function updateSeasonDuration(value: number) {
    setCatalog((current) => ({
      ...current,
      [league]: { ...current[league], seasonDurationDays: value },
    }));
  }

  function addEvent() {
    updateEvents([...events, { ...emptyEventRow, tiers: [] }]);
  }

  function removeEvent(index: number) {
    updateEvents(events.filter((_, i) => i !== index));
  }

  function moveEvent(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= events.length) return;
    const next = [...events];
    [next[index], next[target]] = [next[target], next[index]];
    updateEvents(next);
  }

  function updateEventField(
    index: number,
    field: "name" | "description_fr" | "description_en",
    value: string,
  ) {
    updateEvents(
      events.map((event, i) =>
        i === index ? { ...event, [field]: value } : event,
      ),
    );
  }

  function updateEventDuration(index: number, value: EventDuration) {
    updateEvents(
      events.map((event, i) =>
        i === index ? { ...event, duration: value } : event,
      ),
    );
  }

  function updateEventColor(index: number, value: EventColor) {
    updateEvents(
      events.map((event, i) =>
        i === index ? { ...event, color: value } : event,
      ),
    );
  }

  function updateTiers(eventIndex: number, tiers: EventTierRow[]) {
    updateEvents(
      events.map((event, i) => (i === eventIndex ? { ...event, tiers } : event)),
    );
  }

  function addTier(eventIndex: number) {
    updateTiers(eventIndex, [
      ...events[eventIndex].tiers,
      { ...emptyEventTierRow },
    ]);
  }

  function removeTier(eventIndex: number, tierIndex: number) {
    updateTiers(
      eventIndex,
      events[eventIndex].tiers.filter((_, i) => i !== tierIndex),
    );
  }

  function moveTier(eventIndex: number, tierIndex: number, direction: -1 | 1) {
    const tiers = events[eventIndex].tiers;
    const target = tierIndex + direction;
    if (target < 0 || target >= tiers.length) return;
    const next = [...tiers];
    [next[tierIndex], next[target]] = [next[target], next[tierIndex]];
    updateTiers(eventIndex, next);
  }

  function validateAll() {
    const nextErrors = emptyCatalogErrors();
    const nextSeasonOverruns = { ...seasonOverruns };
    let valid = true;
    for (const catalogLeague of leagues) {
      const catalogLeagueData = catalog[catalogLeague];
      nextErrors[catalogLeague] = catalogLeagueData.events.map((event) => {
        const tierErrors: FieldErrors = {};
        event.tiers.forEach((tier, tierIndex) => {
          if (!tier[objectiveKey].trim())
            tierErrors[errorKey(tierIndex, objectiveKey)] = t("required");
          if (!tier[rewardKey].trim())
            tierErrors[errorKey(tierIndex, rewardKey)] = t("required");
        });
        if (Object.keys(tierErrors).length) valid = false;
        const nameError = event.name.trim() ? undefined : t("required");
        if (nameError) valid = false;
        return { name: nameError, tiers: tierErrors };
      });
      // Bloc 77 review (Codex PR #95): events chain back-to-back, so a
      // league whose events add up to more than its own season length would
      // overflow the timeline (Bloc 77/D) — block the save instead.
      const overruns =
        totalEventHours(catalogLeagueData.events) >
        catalogLeagueData.seasonDurationDays * 24;
      nextSeasonOverruns[catalogLeague] = overruns;
      if (overruns) valid = false;
    }
    setErrors(nextErrors);
    setSeasonOverruns(nextSeasonOverruns);
    return valid;
  }

  async function saveAll() {
    if (!validateAll()) {
      setStatus(t("validation"));
      return;
    }
    setStatus(t("saving"));
    try {
      const response = await fetch("/api/admin/guides/references/events", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(catalog),
      });
      setStatus(response.ok ? t("saved") : t("server-error"));
    } catch {
      setStatus(t("server-error"));
    }
  }

  return (
    <div className="calculator-stack">
      <EditorActionBar backHref="/admin/referentiels" message={status}>
        <EditorialLocaleSelect
          label={t("events-language-label")}
          value={locale}
          onChange={setLocale}
        />
        <button
          className="editor-action editor-action-primary"
          type="button"
          onClick={saveAll}
        >
          {t("save-all")}
        </button>
      </EditorActionBar>
      <section className="admin-panel">
        {/* Bloc 80/A+B: the league buttons get a visible label above them
            (previously aria-only), and the season duration field sits on
            the same line — same .calculator-fields-inline +
            .calculator-league-field pattern already used by every
            calculator that pairs LeagueButtons with another field
            (combat-calculators.tsx, Bloc 69/E), reused here rather than
            invented fresh for the admin editor. */}
        <div className="calculator-fields-inline">
          <div className="calculator-field calculator-league-field">
            {t("events-league-label")}
            <LeagueButtons
              label={t("events-league-label")}
              value={league}
              onChange={(value) => value && setLeague(value)}
            />
          </div>
          {/* Bloc 77/C: admin-editable per league, never hardcoded — feeds
              the public timeline's proportional segment widths (Bloc 77/D). */}
          <label className="calculator-field">
            {t("events-season-duration-label")}
            <input
              type="number"
              min={1}
              max={maxSeasonDurationDays}
              step={1}
              aria-label={t("events-season-duration-label")}
              value={leagueData.seasonDurationDays}
              onChange={(e) =>
                updateSeasonDuration(
                  Math.min(
                    maxSeasonDurationDays,
                    Math.max(1, Math.round(Number(e.target.value) || 1)),
                  ),
                )
              }
            />
            {seasonOverruns[league] && (
              <small className="field-error">
                {t("events-season-overrun", {
                  total: common("duration-hours", {
                    hours: totalEventHours(events),
                  }),
                  season: common("duration-hours", {
                    hours: leagueData.seasonDurationDays * 24,
                  }),
                })}
              </small>
            )}
          </label>
        </div>
      </section>
      <section className="admin-panel editable-reference">
        <div className="editable-reference-title-row">
          <h2 className="editable-reference-title">{t("events-table-title")}</h2>
          <button
            type="button"
            className="icon-action"
            data-testid={`add-event-${league}`}
            aria-label={t("add-event")}
            onClick={addEvent}
          >
            <Plus size={16} aria-hidden="true" />
          </button>
        </div>
        {events.length === 0 && <p className="admin-empty">{t("empty")}</p>}
        {events.map((event, eventIndex) => {
          const eventErrors = leagueErrors[eventIndex];
          return (
            <div
              className="events-admin-card"
              key={eventIndex}
              data-testid={`event-${league}-${eventIndex}`}
            >
              <div className="events-admin-card-header">
                {/* Bloc 79/H: purely informative, computed from the event's
                    current position in the array — never persisted, never
                    shown on the public side. The move-up/down arrows below
                    already reorder the array; this just surfaces where an
                    event currently sits. */}
                <span
                  className="events-admin-position"
                  data-testid={`event-position-${league}-${eventIndex}`}
                  aria-label={t("events-position-aria", {
                    row: eventIndex + 1,
                  })}
                >
                  {eventIndex + 1}
                </span>
                <label className="calculator-field events-admin-name-field">
                  {t("events-columns.name")}
                  <input
                    aria-label={t("event-row-label", {
                      row: eventIndex + 1,
                      field: t("events-columns.name"),
                    })}
                    aria-invalid={Boolean(eventErrors?.name)}
                    value={event.name}
                    onChange={(e) =>
                      updateEventField(eventIndex, "name", e.target.value)
                    }
                  />
                  {eventErrors?.name && (
                    <small className="field-error">{eventErrors.name}</small>
                  )}
                </label>
                {/* Bloc 79/C: 3x wider than a plain field like Nom above —
                    Description is free text and was cramped at the same
                    default width. */}
                <label className="calculator-field events-admin-description-field">
                  {t("events-columns.description")}
                  <input
                    aria-label={t("event-row-label", {
                      row: eventIndex + 1,
                      field: t("events-columns.description"),
                    })}
                    value={event[descriptionKey]}
                    onChange={(e) =>
                      updateEventField(eventIndex, descriptionKey, e.target.value)
                    }
                  />
                </label>
                {/* Bloc 79/B: buttons instead of a <select> — same
                    .family-buttons/role=group pattern as LeagueButtons
                    (Bloc 61), for a fixed 3-choice enum this is a single
                    click instead of an open-select-then-pick interaction. */}
                <div className="calculator-field">
                  {t("events-columns.duration")}
                  <div
                    className="family-buttons"
                    role="group"
                    aria-label={t("event-row-label", {
                      row: eventIndex + 1,
                      field: t("events-columns.duration"),
                    })}
                  >
                    {eventDurations.map((duration) => (
                      <button
                        key={duration}
                        type="button"
                        aria-pressed={event.duration === duration}
                        onClick={() => updateEventDuration(eventIndex, duration)}
                      >
                        {common("duration-hours", { hours: duration })}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Bloc 80/F: manual color picker, replacing Bloc 79/G's
                    auto-derivation from the name entirely — applied to the
                    public timeline segment and tile title (events-reference.tsx). */}
                <div className="calculator-field">
                  {t("events-columns.color")}
                  <EventColorPicker
                    value={event.color}
                    onChange={(color) => updateEventColor(eventIndex, color)}
                    label={t("event-row-label", {
                      row: eventIndex + 1,
                      field: t("events-columns.color"),
                    })}
                    swatchLabel={(color) => t(`event-colors.${color}`)}
                    testId={`event-color-${league}-${eventIndex}`}
                  />
                </div>
                <div className="events-admin-card-actions">
                  <button
                    className="secondary-action"
                    type="button"
                    data-testid={`move-up-event-${league}-${eventIndex}`}
                    onClick={() => moveEvent(eventIndex, -1)}
                    disabled={eventIndex === 0}
                    aria-label={t("move-up")}
                  >
                    <ArrowUp size={16} aria-hidden="true" />
                  </button>
                  <button
                    className="secondary-action"
                    type="button"
                    data-testid={`move-down-event-${league}-${eventIndex}`}
                    onClick={() => moveEvent(eventIndex, 1)}
                    disabled={eventIndex === events.length - 1}
                    aria-label={t("move-down")}
                  >
                    <ArrowDown size={16} aria-hidden="true" />
                  </button>
                  <button
                    className="icon-action danger-action"
                    type="button"
                    data-testid={`remove-event-${league}-${eventIndex}`}
                    aria-label={t("remove")}
                    onClick={() => {
                      if (window.confirm(t("confirm-remove")))
                        removeEvent(eventIndex);
                    }}
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
                </div>
              </div>
              <details className="events-admin-tiers">
                <summary>
                  {t("events-tiers-summary", { count: event.tiers.length })}
                </summary>
                <div className="editable-reference-title-row">
                  <button
                    type="button"
                    className="icon-action"
                    data-testid={`add-tier-${league}-${eventIndex}`}
                    aria-label={t("add-tier")}
                    onClick={() => addTier(eventIndex)}
                  >
                    <Plus size={16} aria-hidden="true" />
                  </button>
                </div>
                <EditableDataTable
                  rows={event.tiers}
                  columns={tierColumns(t, lang, (index, field) =>
                    t("tier-row-label", {
                      row: index + 1,
                      field,
                      event: event.name || `#${eventIndex + 1}`,
                    }),
                  )}
                  tableClassName="events-tiers-table"
                  testIdPrefix={`${league}-${eventIndex}`}
                  onChange={(tiers) => updateTiers(eventIndex, tiers)}
                  onRemove={(tierIndex) => removeTier(eventIndex, tierIndex)}
                  onMove={(tierIndex, direction) =>
                    moveTier(eventIndex, tierIndex, direction)
                  }
                  removeIcon
                  removeConfirmMessage={t("confirm-remove")}
                  removeLabel={t("remove")}
                  moveUpLabel={t("move-up")}
                  moveDownLabel={t("move-down")}
                  emptyLabel={t("empty")}
                  errors={eventErrors?.tiers}
                  combinedActions
                  actionsLabel={t("actions")}
                />
              </details>
            </div>
          );
        })}
      </section>
    </div>
  );
}
