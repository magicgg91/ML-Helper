"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { cityLeagues, type CityParameters } from "../lib/city-parameters";
import type { TemplarParameters } from "../lib/templar-parameters";
import {
  confirmedLevelUpLeagues,
  type LevelUpParameters,
} from "../lib/level-up";
import type { XpTier } from "../lib/combat-calculators";
import {
  gemLeagues,
  type GemLeague,
  type GemParameters,
} from "../lib/gem-parameters";
import {
  leagues as allLeagues,
  skillKeys,
  type League,
  type SkillKey,
} from "../lib/player-settings";
import { EditorActionBar } from "./editor-action-bar";
import { selectOnFocus } from "../lib/utils";

function useToolSave(endpoint: string, payload: unknown) {
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

export function CityParametersEditor({ initial }: { initial: CityParameters }) {
  const t = useTranslations("admin.city-parameters");
  const tCommon = useTranslations("admin.parameters");
  const leagues = useTranslations("game.leagues");
  const [value, setValue] = useState(initial);
  const { status, save } = useToolSave(
    "/api/admin/tools/city-parameters",
    value,
  );
  const updateFormula = (
    key: "vp" | "walls" | "cost",
    field: "base" | "ratio",
    next: number,
  ) =>
    setValue((current) => ({
      ...current,
      [key]: { ...current[key], [field]: next },
    }));
  return (
    <div className="calculator-stack">
      <EditorActionBar backHref="/admin/tools" message={status}>
        <button
          className="editor-action editor-action-primary"
          type="button"
          onClick={save}
        >
          {tCommon("save")}
        </button>
      </EditorActionBar>
      <section className="admin-panel">
        <h2>{t("progression")}</h2>
        <div className="calculator-fields">
          {(["vp", "walls", "cost"] as const).flatMap((key) => [
            <NumericField
              key={`${key}-base`}
              label={t(`${key}.base`)}
              value={value[key].base}
              onChange={(next) => updateFormula(key, "base", next)}
            />,
            <NumericField
              key={`${key}-ratio`}
              label={t(`${key}.ratio`)}
              value={value[key].ratio}
              onChange={(next) => updateFormula(key, "ratio", next)}
            />,
          ])}
        </div>
      </section>
      <section className="admin-panel">
        <h2>{t("multipliers")}</h2>
        <div className="ranking-table-wrap">
          <table className="ranking-table">
            <thead>
              <tr>
                <th>{t("league")}</th>
                <th>{t("army")}</th>
                <th>{t("gold")}</th>
              </tr>
            </thead>
            <tbody>
              {cityLeagues.map((league) => (
                <tr key={league}>
                  <td>{leagues(league)}</td>
                  {(["army", "gold"] as const).map((field) => (
                    <td key={field}>
                      <input
                        aria-label={`${leagues(league)} ${t(field)}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={value.multipliers[league][field]}
                        onChange={(event) =>
                          setValue((current) => ({
                            ...current,
                            multipliers: {
                              ...current.multipliers,
                              [league]: {
                                ...current.multipliers[league],
                                [field]: Number(event.target.value),
                              },
                            },
                          }))
                        }
                        onFocus={selectOnFocus}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
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
      <EditorActionBar backHref="/admin/guides" message={status}>
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
            <thead>
              <tr>
                <th>{t("league")}</th>
                <th>{t("coefficient")}</th>
                <th>{t("ratio")}</th>
              </tr>
            </thead>
            <tbody>
              {confirmedLevelUpLeagues.map((league) => (
                <tr key={league}>
                  <td>{leagues(league)}</td>
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
              {/* Bloc 42/B: Silver's troop formula is still unconfirmed
                  (levelUpTroopsAt keeps returning null for it), but
                  AGENTS.md requires unconfirmed data to stay admin-editable
                  with a default value — a real input replaces the previous
                  static "not confirmed" text, so an admin can start filling
                  it in once the values are known. */}
              <tr>
                <td>
                  {leagues("silver")}{" "}
                  <small className="unconfirmed">({t("unconfirmed")})</small>
                </td>
                <td>
                  <input
                    aria-label={`${leagues("silver")} ${t("coefficient")}`}
                    type="number"
                    step="0.0001"
                    value={value.troops.silver.coefficient}
                    onChange={(event) =>
                      updateTroops(
                        "silver",
                        "coefficient",
                        Number(event.target.value),
                      )
                    }
                    onFocus={selectOnFocus}
                  />
                </td>
                <td>
                  <input
                    aria-label={`${leagues("silver")} ${t("ratio")}`}
                    type="number"
                    step="0.001"
                    value={value.troops.silver.ratio}
                    onChange={(event) =>
                      updateTroops(
                        "silver",
                        "ratio",
                        Number(event.target.value),
                      )
                    }
                    onFocus={selectOnFocus}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export function XpGainRateEditor({ initial }: { initial: XpTier[] }) {
  const t = useTranslations("admin.xp-gain-rate");
  const tCommon = useTranslations("admin.parameters");
  const [tiers, setTiers] = useState(initial);
  const { status, save } = useToolSave("/api/admin/tools/xp-gain-rate", {
    tiers,
  });

  // A tier's upper bound is the next tier's lower bound: editing one input
  // updates both sides, so the 5 tiers can never end up with a gap or an
  // overlap between them.
  const updateBoundary = (index: number, next: number) =>
    setTiers((current) =>
      current.map((tier, i) => {
        if (i === index) return { ...tier, high: next };
        if (i === index + 1) return { ...tier, low: next };
        return tier;
      }),
    );
  const updateRate = (index: number, next: number) =>
    setTiers((current) =>
      current.map((tier, i) => (i === index ? { ...tier, rate: next } : tier)),
    );

  return (
    <div className="calculator-stack">
      <EditorActionBar backHref="/admin/tools" message={status}>
        <button
          className="editor-action editor-action-primary"
          type="button"
          onClick={save}
        >
          {tCommon("save")}
        </button>
      </EditorActionBar>
      <p>{t("formula")}</p>
      <section className="admin-panel">
        <div className="table-scroll">
          <table className="ranking-table">
            <thead>
              <tr>
                <th>{t("tier")}</th>
                <th>{t("upper-bound")}</th>
                <th>{t("rate")}</th>
              </tr>
            </thead>
            <tbody>
              {tiers.map((tier, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td>
                    {tier.high === null ? (
                      "∞"
                    ) : (
                      <input
                        aria-label={t("upper-bound-field", {
                          tier: index + 1,
                        })}
                        type="number"
                        min="0"
                        step="1"
                        value={tier.high}
                        onChange={(event) =>
                          updateBoundary(index, Number(event.target.value))
                        }
                        onFocus={selectOnFocus}
                      />
                    )}
                  </td>
                  <td>
                    <input
                      aria-label={t("rate-field", { tier: index + 1 })}
                      type="number"
                      min="0"
                      step="1"
                      value={tier.rate}
                      onChange={(event) =>
                        updateRate(index, Number(event.target.value))
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

export function DemoAttackTroopsEditor({
  initial,
}: {
  initial: Record<League, number>;
}) {
  const t = useTranslations("admin.demo-attack-troops");
  const tCommon = useTranslations("admin.parameters");
  const gameLeagues = useTranslations("game.leagues");
  const [value, setValue] = useState(initial);
  const { status, save } = useToolSave("/api/admin/tools/demo-attack-troops", {
    percentages: value,
  });
  return (
    <div className="calculator-stack">
      <EditorActionBar backHref="/admin/tools" message={status}>
        <button
          className="editor-action editor-action-primary"
          type="button"
          onClick={save}
        >
          {tCommon("save")}
        </button>
      </EditorActionBar>
      <p>{t("formula")}</p>
      <section className="admin-panel">
        <div className="table-scroll">
          <table className="ranking-table">
            <thead>
              <tr>
                <th>{tCommon("league")}</th>
                <th>{t("percentage")}</th>
              </tr>
            </thead>
            <tbody>
              {allLeagues.map((league) => (
                <tr key={league}>
                  <td>{gameLeagues(league)}</td>
                  <td>
                    <input
                      aria-label={`${gameLeagues(league)} ${t("percentage")}`}
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={value[league]}
                      onChange={(event) =>
                        setValue((current) => ({
                          ...current,
                          [league]: Number(event.target.value),
                        }))
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

export function GemParametersEditor({
  initial,
  backHref = "/admin/tools",
}: {
  initial: GemParameters;
  backHref?: string;
}) {
  const t = useTranslations("admin.gems");
  const tCommon = useTranslations("admin.parameters");
  const game = useTranslations("game");
  const [value, setValue] = useState(initial);
  const { status, save } = useToolSave("/api/admin/tools/gems", value);
  const updateValue = (skill: SkillKey, league: League, next: number) =>
    setValue((current) => ({
      ...current,
      skillLeagueValue: {
        ...current.skillLeagueValue,
        [skill]: { ...current.skillLeagueValue[skill], [league]: next },
      },
    }));
  const updatePrice = (league: GemLeague, next: number) =>
    setValue((current) => ({
      ...current,
      gemPrice: { ...current.gemPrice, [league]: next },
    }));
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
      <section className="admin-panel">
        <h2>{t("value")}</h2>
        <div className="table-scroll">
          <table className="ranking-table">
            <thead>
              <tr>
                <th></th>
                {allLeagues.map((league) => (
                  <th key={league} className="reference-admin-narrow">
                    {game(`leagues.${league}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {skillKeys.map((skill) => (
                <tr key={skill}>
                  <td>{game(`skills.${skill}`)}</td>
                  {allLeagues.map((league) => (
                    <td key={league} className="reference-admin-narrow">
                      <input
                        aria-label={t("value-field", {
                          skill: game(`skills.${skill}`),
                          league: game(`leagues.${league}`),
                        })}
                        type="number"
                        min="0"
                        step="0.5"
                        value={value.skillLeagueValue[skill][league]}
                        onChange={(event) =>
                          updateValue(skill, league, Number(event.target.value))
                        }
                        onFocus={selectOnFocus}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="admin-panel">
        <h2>{t("price")}</h2>
        <div className="table-scroll">
          <table className="ranking-table">
            <thead>
              <tr>
                {gemLeagues.map((league) => (
                  <th key={league}>{game(`leagues.${league}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {gemLeagues.map((league) => (
                  <td key={league}>
                    <input
                      aria-label={t("price-field", {
                        league: game(`leagues.${league}`),
                      })}
                      type="number"
                      min="0"
                      step="100"
                      value={value.gemPrice[league]}
                      onChange={(event) =>
                        updatePrice(league, Number(event.target.value))
                      }
                      onFocus={selectOnFocus}
                    />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
