"use client";

import { useMemo, useState } from "react";
import { formatGameNumber } from "../lib/city-calculators";
import {
  gemFamilies,
  gemPrice,
  gemValue,
  optimizeGemBudget,
  optimizeGemTarget,
  templarCosts,
  templarRates,
  templarUpgradeCost,
  type GemFamily,
  type GemLeague,
} from "../lib/gems-templars";
import {
  skillKeys,
  templarKeys,
  type SkillKey,
  type TemplarKey,
} from "../lib/player-settings";
import { NumberStepper } from "./number-stepper";
import { StuffComparison, StuffSimulator } from "./equipment-tools";

const skillLabels: Record<SkillKey, string> = {
  striker: "Attaque",
  brave: "Bravoure",
  scavenger: "Charognard",
  guardian: "Défense",
  fearless: "Intrépide",
  prosperous: "Prospérité",
  recruiter: "Recruteur",
  cautious: "Récupération",
  salvager: "Recycleur",
  rusher: "Vitesse",
};
const leagueLabels: Record<GemLeague, string> = {
  silver: "Argent",
  gold: "Or",
  platinum: "Platine",
  diamond: "Diamant",
  legend: "Légende",
};
const familyLabels: Record<GemFamily, string> = {
  attack: "Attaque",
  defense: "Défense",
  gold: "Or",
  speed: "Vitesse",
};
const templarLabels: Record<TemplarKey, string> = {
  striker: "Attaque",
  guardian: "Défense",
  prosperous: "Or",
  recruiter: "Recruteur",
  rusher: "Vitesse",
};
const gemLeagues = Object.keys(leagueLabels) as GemLeague[];

type GemRow = {
  id: number;
  skill: SkillKey;
  league: GemLeague;
  slots: number;
  target: number;
};

export function SkillsCalculators() {
  const [active, setActive] = useState<
    "simulator" | "comparison" | "gems" | "templars"
  >("simulator");
  return (
    <div className="city-calculators">
      <div
        className="calculator-tabs"
        role="tablist"
        aria-label="Calculateurs Compétences"
      >
        <button
          type="button"
          role="tab"
          aria-selected={active === "simulator"}
          onClick={() => setActive("simulator")}
        >
          Simulateur de Stuff
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={active === "comparison"}
          onClick={() => setActive("comparison")}
        >
          Comparaison de stuff
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={active === "gems"}
          onClick={() => setActive("gems")}
        >
          Gemmes
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={active === "templars"}
          onClick={() => setActive("templars")}
        >
          Templiers
        </button>
      </div>
      {active === "simulator" ? (
        <StuffSimulator />
      ) : active === "comparison" ? (
        <StuffComparison />
      ) : active === "gems" ? (
        <GemsCalculator />
      ) : (
        <TemplarsCalculator />
      )}
    </div>
  );
}

function GemsCalculator() {
  const [mode, setMode] = useState<"optimize" | "budget">("optimize");
  return (
    <div className="calculator-stack">
      <section className="calculator-card">
        <h2>Gemmes</h2>
        <p>
          Jusqu’à 27 emplacements, avec répartition uniforme pour limiter le
          coût exponentiel des fusions.
        </p>
        <div
          className="calculator-tabs compact"
          role="tablist"
          aria-label="Mode Gemmes"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "optimize"}
            onClick={() => setMode("optimize")}
          >
            Optimisation
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "budget"}
            onClick={() => setMode("budget")}
          >
            Budget disponible
          </button>
        </div>
      </section>
      {mode === "optimize" ? <GemOptimization /> : <GemBudget />}
    </div>
  );
}

function GemOptimization() {
  const [family, setFamily] = useState<GemFamily>("attack");
  const [totalSlots, setTotalSlots] = useState(27);
  const [nextId, setNextId] = useState(2);
  const [rows, setRows] = useState<GemRow[]>([
    { id: 1, skill: "striker", league: "legend", slots: 0, target: 0 },
  ]);
  const allowed = gemFamilies[family];
  const allocated = rows.reduce((sum, row) => sum + row.slots, 0);
  const update = (id: number, patch: Partial<GemRow>) =>
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  const setSlots = (id: number, value: number) =>
    setRows((current) => {
      const others = current.reduce(
        (sum, row) => (row.id === id ? sum : sum + row.slots),
        0,
      );
      return current.map((row) =>
        row.id === id
          ? {
              ...row,
              slots: Math.min(
                Math.max(0, Math.floor(value)),
                Math.max(0, totalSlots - others),
              ),
            }
          : row,
      );
    });
  const changeFamily = (value: GemFamily) => {
    setFamily(value);
    setRows([
      {
        id: nextId,
        skill: gemFamilies[value][0],
        league: "legend",
        slots: 0,
        target: 0,
      },
    ]);
    setNextId((id) => id + 1);
  };
  const changeTotal = (value: number) => {
    const total = Math.max(1, Math.min(27, Math.floor(value)));
    setTotalSlots(total);
    setRows((current) => {
      let remaining = total;
      return current.map((row) => {
        const slots = Math.min(row.slots, remaining);
        remaining -= slots;
        return { ...row, slots };
      });
    });
  };
  const results = rows
    .filter((row) => row.slots > 0)
    .map((row) => {
      const result = optimizeGemTarget(
        row.target,
        gemValue(row.skill, row.league),
        row.slots,
      );
      return { ...row, result, cost: result.baseGems * gemPrice[row.league] };
    });
  const totalCost = results.reduce((sum, row) => sum + row.cost, 0);
  return (
    <>
      <section className="calculator-card">
        <h3>Optimisation multi-compétences</h3>
        <div className="family-buttons" aria-label="Famille de gemmes">
          {(Object.keys(familyLabels) as GemFamily[]).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={family === key}
              onClick={() => changeFamily(key)}
            >
              {familyLabels[key]}
            </button>
          ))}
        </div>
        <label className="calculator-field gem-total-slots">
          Emplacements disponibles
          <NumberStepper
            label="Emplacements disponibles"
            value={totalSlots}
            min={1}
            max={27}
            onChange={changeTotal}
          />
        </label>
        <div className="gem-rows">
          {rows.map((row, index) => (
            <div className="gem-row" key={row.id}>
              <label>
                Compétence
                <select
                  aria-label={`Compétence ligne ${index + 1}`}
                  value={row.skill}
                  onChange={(event) =>
                    update(row.id, { skill: event.target.value as SkillKey })
                  }
                >
                  {allowed.map((skill) => (
                    <option key={skill} value={skill}>
                      {skillLabels[skill]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Ligue
                <select
                  aria-label={`Ligue ligne ${index + 1}`}
                  value={row.league}
                  onChange={(event) =>
                    update(row.id, { league: event.target.value as GemLeague })
                  }
                >
                  {gemLeagues.map((league) => (
                    <option key={league} value={league}>
                      {leagueLabels[league]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Emplacements alloués
                <NumberStepper
                  label={`Emplacements ligne ${index + 1}`}
                  value={row.slots}
                  min={0}
                  max={27}
                  onChange={(value) => setSlots(row.id, value)}
                />
              </label>
              <label>
                Stat cible (%)
                <NumberStepper
                  label={`Stat cible ligne ${index + 1}`}
                  value={row.target}
                  min={0}
                  step={0.5}
                  onChange={(value) => update(row.id, { target: value })}
                />
              </label>
              <button
                type="button"
                aria-label={`Supprimer ligne ${index + 1}`}
                onClick={() =>
                  setRows((current) =>
                    current.filter((item) => item.id !== row.id),
                  )
                }
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="secondary-action"
          onClick={() => {
            const used = rows.map((row) => row.skill);
            const skill =
              allowed.find((item) => !used.includes(item)) ?? allowed[0];
            setRows((current) => [
              ...current,
              { id: nextId, skill, league: "legend", slots: 0, target: 0 },
            ]);
            setNextId((id) => id + 1);
          }}
        >
          + Ajouter une stat
        </button>
        <p className="calculator-note">
          Emplacements alloués :{" "}
          <strong data-testid="gem-allocated">{allocated}</strong> /{" "}
          {totalSlots}
        </p>
      </section>
      <section className="calculator-card">
        <h3>Résultat</h3>
        {results.length === 0 ? (
          <p className="ranking-placeholder">
            Ajoute une stat avec des emplacements supérieurs à zéro.
          </p>
        ) : (
          <div className="ranking-table-wrap">
            <table className="ranking-table">
              <thead>
                <tr>
                  <th>Compétence</th>
                  <th>Ligue</th>
                  <th>Emplacements</th>
                  <th>Répartition</th>
                  <th>Stat obtenue</th>
                  <th>Coût</th>
                </tr>
              </thead>
              <tbody>
                {results.map((row) => (
                  <tr key={row.id}>
                    <td>{skillLabels[row.skill]}</td>
                    <td>{leagueLabels[row.league]}</td>
                    <td>{row.slots}</td>
                    <td>{row.result.label}</td>
                    <td>{row.result.actualStat}%</td>
                    <td>{formatGameNumber(row.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="result-highlight">
          <span>Coût total</span>
          <strong>{formatGameNumber(totalCost)} saphirs</strong>
        </div>
      </section>
    </>
  );
}

function GemBudget() {
  const [skill, setSkill] = useState<SkillKey>("fearless");
  const [league, setLeague] = useState<GemLeague>("legend");
  const [slots, setSlots] = useState(27);
  const [budget, setBudget] = useState(0);
  const result = optimizeGemBudget(
    budget,
    gemPrice[league],
    gemValue(skill, league),
    slots,
  );
  return (
    <>
      <section className="calculator-card">
        <div className="calculator-fields">
          <label className="calculator-field">
            Compétence
            <select
              value={skill}
              onChange={(event) => setSkill(event.target.value as SkillKey)}
            >
              {skillKeys.map((key) => (
                <option key={key} value={key}>
                  {skillLabels[key]}
                </option>
              ))}
            </select>
          </label>
          <label className="calculator-field">
            Ligue
            <select
              value={league}
              onChange={(event) => setLeague(event.target.value as GemLeague)}
            >
              {gemLeagues.map((key) => (
                <option key={key} value={key}>
                  {leagueLabels[key]}
                </option>
              ))}
            </select>
          </label>
          <label className="calculator-field">
            Emplacements disponibles
            <NumberStepper
              label="Emplacements budget"
              value={slots}
              min={1}
              max={27}
              onChange={(value) => setSlots(Math.floor(value))}
            />
          </label>
          <label className="calculator-field">
            Budget disponible (saphirs)
            <NumberStepper
              label="Budget disponible en saphirs"
              value={budget}
              min={0}
              onChange={(value) => setBudget(Math.floor(value))}
            />
          </label>
        </div>
      </section>
      <section className="calculator-card">
        <div className="budget-result-main">
          <span>Répartition optimale</span>
          <strong data-testid="gem-budget-distribution">{result.label}</strong>
        </div>
        <div className="calculator-results">
          <Result
            label="Gemmes de base à acheter"
            value={String(result.baseGems)}
          />
          <Result
            label="Emplacements utilisés"
            value={`${result.slotsUsed} / ${slots}`}
          />
          <Result label="Stat obtenue" value={`${result.actualStat}%`} />
          <Result
            label="Coût réel"
            value={`${formatGameNumber(result.cost)} saphirs`}
          />
          <Result
            label="Budget restant"
            value={`${formatGameNumber(result.remaining)} saphirs`}
          />
        </div>
      </section>
    </>
  );
}

function Result({ label, value }: { label: string; value: string }) {
  return (
    <div className="calculator-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

type TemplarState = Record<TemplarKey, { start: number; target: number }>;
function TemplarsCalculator() {
  const [selected, setSelected] = useState<TemplarKey>("striker");
  const [levels, setLevels] = useState<TemplarState>(
    () =>
      Object.fromEntries(
        templarKeys.map((key) => [key, { start: 0, target: 1 }]),
      ) as TemplarState,
  );
  const current = levels[selected];
  const rate = templarRates[selected];
  const cost = templarUpgradeCost(current.start, current.target);
  const gain = (current.target - current.start) * rate;
  const update = (field: "start" | "target", value: number) =>
    setLevels((state) => ({
      ...state,
      [selected]: {
        ...state[selected],
        [field]: Math.max(0, Math.min(20, Math.floor(value))),
      },
    }));
  const cumulative = useMemo(
    () =>
      templarCosts.map((_, index) =>
        templarCosts.slice(0, index + 1).reduce((sum, item) => sum + item, 0),
      ),
    [],
  );
  return (
    <div className="calculator-stack">
      <section className="calculator-card">
        <h2>Templiers</h2>
        <p>
          Chaque type conserve indépendamment son niveau de départ et son niveau
          cible.
        </p>
        <div className="family-buttons">
          {templarKeys.map((key) => (
            <button
              type="button"
              key={key}
              aria-pressed={selected === key}
              onClick={() => setSelected(key)}
            >
              {templarLabels[key]}
            </button>
          ))}
        </div>
        <div className="calculator-fields">
          <label className="calculator-field">
            Niveau de départ
            <NumberStepper
              label="Niveau Templier de départ"
              value={current.start}
              min={0}
              max={20}
              onChange={(value) => update("start", value)}
            />
          </label>
          <label className="calculator-field">
            Niveau cible
            <NumberStepper
              label="Niveau Templier cible"
              value={current.target}
              min={0}
              max={20}
              onChange={(value) => update("target", value)}
            />
          </label>
        </div>
      </section>
      <section className="calculator-card">
        <div className="result-highlight">
          <span>Coût total — {templarLabels[selected]}</span>
          <strong data-testid="templar-cost">
            {formatGameNumber(cost)} Pouciel
          </strong>
        </div>
        <div className="calculator-results">
          <Result label="Bonus par Templier" value={`${rate}%`} />
          <Result
            label={`Bonus total au niveau ${current.target}`}
            value={`${current.target * rate}%`}
          />
          <Result
            label="Gain départ → cible"
            value={`${gain >= 0 ? "+" : ""}${gain}%`}
          />
        </div>
      </section>
      <section className="calculator-card">
        <h3>Table de coût exacte</h3>
        <div className="ranking-table-wrap">
          <table className="ranking-table">
            <thead>
              <tr>
                <th>Niveau actuel</th>
                <th>Coût du niveau</th>
                <th>Coût cumulé</th>
              </tr>
            </thead>
            <tbody>
              {templarCosts.map((item, index) => (
                <tr key={index}>
                  <td>{index}</td>
                  <td>{formatGameNumber(item)}</td>
                  <td>{formatGameNumber(cumulative[index])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
