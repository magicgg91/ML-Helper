"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { TemplarParameters } from "../lib/templar-parameters";
import {
  hasLevelUpTroopsFormula,
  parseLevelUpParameters,
  type LevelUpParameters,
} from "../lib/level-up";
import { leagues as allLeagues, type League } from "../lib/player-settings";
import { EditorActionBar } from "./editor-action-bar";
import { selectOnFocus } from "../lib/utils";

function useToolSave(
  endpoint: string,
  payload: unknown,
  // Bloc 107/A: what the server really stored, for editors that adopt it back
  // — see LevelUpParametersEditor. Omitted, the form keeps its own state, as
  // every editor did before.
  onSaved?: (stored: unknown) => void,
) {
  const t = useTranslations("admin.parameters");
  const [status, setStatus] = useState("");
  async function save() {
    setStatus(t("saving"));
    try {
      const response = await fetch(endpoint, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (response.ok) onSaved?.(await response.json().catch(() => undefined));
      setStatus(
        response.ok ? t("saved") : t("error", { status: response.status }),
      );
    } catch {
      setStatus(t("server-error"));
    }
  }
  return { status, save };
}

function NumericField({
  label,
  value,
  onChange,
  step = 0.001,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
}) {
  return (
    <label className="calculator-field">
      {label}
      <input
        aria-label={label}
        type="number"
        min="0.0001"
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        onFocus={selectOnFocus}
      />
    </label>
  );
}

export function TemplarParametersEditor({
  initial,
  backHref = "/admin/tools",
}: {
  initial: TemplarParameters;
  backHref?: string;
}) {
  const t = useTranslations("admin.templar-parameters");
  const tCommon = useTranslations("admin.parameters");
  const [value, setValue] = useState(initial);
  const { status, save } = useToolSave("/api/admin/tools/templars", value);
  return (
    <div className="calculator-stack">
      <EditorActionBar backHref={backHref} message={status}>
        <button
          className="editor-action editor-action-primary"
          type="button"
          onClick={save}
        >
          {tCommon("save")}
        </button>
      </EditorActionBar>
      <p>{t("formula")}</p>
      <div className="calculator-fields">
        <NumericField
          label={t("base")}
          value={value.base}
          step={1}
          onChange={(base) => setValue((current) => ({ ...current, base }))}
        />
        <NumericField
          label={t("ratio")}
          value={value.ratio}
          onChange={(ratio) => setValue((current) => ({ ...current, ratio }))}
        />
      </div>
    </div>
  );
}

export function LevelUpParametersEditor({
  initial,
}: {
  initial: LevelUpParameters;
}) {
  const t = useTranslations("admin.parameters"),
    leagues = useTranslations("game.leagues");
  const [value, setValue] = useState(initial);
  const { status, save } = useToolSave(
    "/api/admin/guides/references/level-up",
    value,
    // Bloc 107/A: this form used to show what was TYPED and never what was
    // stored, so a save the route rejected (or normalised) looked exactly like
    // one it accepted — and the public table, which computes from the stored
    // row, could disagree with this screen indefinitely. That is how a wrong
    // ratio survives a check: the admin reads its own unsaved state back to
    // itself. The route echoes the parsed parameters, so adopt them. An edit
    // made while the request was in flight is overwritten, deliberately —
    // showing the stored values is the point.
    (stored) => setValue(parseLevelUpParameters(stored)),
  );
  const updateTroops = (
    league: League,
    field: "coefficient" | "ratio",
    next: number,
  ) =>
    setValue((current) => ({
      ...current,
      troops: {
        ...current.troops,
        [league]: { ...current.troops[league], [field]: next },
      },
    }));
  return (
    <div className="calculator-stack">
      <EditorActionBar backHref="/admin/referentiels" message={status}>
        <button
          className="editor-action editor-action-primary"
          type="button"
          onClick={save}
        >
          {t("save")}
        </button>
      </EditorActionBar>
      <section className="admin-panel">
        <div className="calculator-fields">
          <NumericField
            label={t("xp-base")}
            value={value.xp.base}
            step={1}
            onChange={(base) =>
              setValue((current) => ({
                ...current,
                xp: { ...current.xp, base },
              }))
            }
          />
          <NumericField
            label={t("xp-ratio")}
            value={value.xp.ratio}
            onChange={(ratio) =>
              setValue((current) => ({
                ...current,
                xp: { ...current.xp, ratio },
              }))
            }
          />
        </div>
      </section>
      <section className="admin-panel">
        <div className="table-scroll">
          <table className="ranking-table">
            {/* Bloc 107/A: nothing on either screen said which formula these
                two numbers feed, nor how little room there is between two
                leagues — Bronze's 1.245 and Silver's 1.243 agree to within
                0.3% up to level 10 and are 10% apart by level 60. A ratio
                typed one league off is therefore invisible exactly where an
                admin would check it. The caption states both. */}
            <caption className="admin-table-caption">
              {t("troops-hint")}
            </caption>
            <thead>
              <tr>
                <th>{t("league")}</th>
                <th>{t("coefficient")}</th>
                <th>{t("ratio")}</th>
              </tr>
            </thead>
            <tbody>
              {/* Bloc 42/B: every league gets a real coefficient/ratio field —
                  AGENTS.md requires unconfirmed data to stay admin-editable
                  with a default value. Bloc 98/A+C: one row per league, taken
                  from the shared league list in game progression order, so
                  Silver is no longer a hand-written row appended after the
                  five "confirmed" ones. The note next to a league's name is
                  now driven by what is actually stored, so it disappears as
                  soon as that league's two values are filled in (Bloc 98/B). */}
              {allLeagues.map((league) => (
                <tr key={league}>
                  <td>
                    {leagues(league)}{" "}
                    {!hasLevelUpTroopsFormula(league, value) && (
                      <small className="unconfirmed">
                        ({t("unconfirmed")})
                      </small>
                    )}
                  </td>
                  <td>
                    <input
                      aria-label={`${leagues(league)} ${t("coefficient")}`}
                      type="number"
                      step="0.0001"
                      value={value.troops[league].coefficient}
                      onChange={(event) =>
                        updateTroops(
                          league,
                          "coefficient",
                          Number(event.target.value),
                        )
                      }
                      onFocus={selectOnFocus}
                    />
                  </td>
                  <td>
                    <input
                      aria-label={`${leagues(league)} ${t("ratio")}`}
                      type="number"
                      step="0.001"
                      value={value.troops[league].ratio}
                      onChange={(event) =>
                        updateTroops(
                          league,
                          "ratio",
                          Number(event.target.value),
                        )
                      }
                      onFocus={selectOnFocus}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
