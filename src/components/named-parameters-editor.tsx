"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { cityLeagues, type CityParameters } from "../lib/city-parameters";
import type { TemplarParameters } from "../lib/templar-parameters";
import {
  confirmedLevelUpLeagues,
  type LevelUpParameters,
} from "../lib/level-up";
import { EditorActionBar } from "./editor-action-bar";

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

function SaveButton({
  endpoint,
  payload,
}: {
  endpoint: string;
  payload: unknown;
}) {
  const t = useTranslations("admin.parameters");
  const { status, save } = useToolSave(endpoint, payload);
  return (
    <>
      <button className="primary-button" type="button" onClick={save}>
        {t("save")}
      </button>
      {status && (
        <p role="status" className="form-status">
          {status}
        </p>
      )}
    </>
  );
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
}: {
  initial: TemplarParameters;
}) {
  const t = useTranslations("admin.templar-parameters");
  const tCommon = useTranslations("admin.parameters");
  const [value, setValue] = useState(initial);
  const { status, save } = useToolSave("/api/admin/tools/templars", value);
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
  const updateTroops = (
    league: (typeof confirmedLevelUpLeagues)[number],
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
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          {leagues("silver")} — {t("unconfirmed")}
        </p>
      </section>
      <SaveButton
        endpoint="/api/admin/guides/references/level-up"
        payload={value}
      />
    </div>
  );
}
