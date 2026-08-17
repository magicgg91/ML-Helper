"use client";

import { useMemo, useState } from "react";
import { rarityOrder } from "../lib/equipment";
import {
  combatValueAtStar,
  expeditionValueAtStar,
  type CombatReferenceRow,
  type ExpeditionReferenceRow,
} from "../lib/reference-equipment";

function formatPercent(value: number | null) {
  return value === null
    ? "—"
    : `${value.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}%`;
}

function Filters({
  families,
  family,
  setFamily,
  rarities,
  toggleRarity,
  search,
  setSearch,
  star,
  setStar,
}: {
  families: readonly string[];
  family: string;
  setFamily: (value: string) => void;
  rarities: Set<string>;
  toggleRarity: (value: string) => void;
  search: string;
  setSearch: (value: string) => void;
  star: number;
  setStar: (value: number) => void;
}) {
  return (
    <div className="reference-filters">
      <div>
        <span className="filter-label">Famille</span>
        <div className="family-buttons">
          {families.map((item) => (
            <button
              type="button"
              aria-pressed={family === item}
              key={item}
              onClick={() => setFamily(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      <div>
        <span className="filter-label">Rareté</span>
        <div className="family-buttons">
          {rarityOrder.map((item) => (
            <button
              type="button"
              aria-pressed={rarities.has(item)}
              key={item}
              onClick={() => toggleRarity(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      <label>
        Recherche libre
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Set ou emplacement…"
        />
      </label>
      <label>
        Niveau d’étoile
        <select
          value={star}
          onChange={(event) => setStar(Number(event.target.value))}
        >
          {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
            <option value={item} key={item}>
              {item}★
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function useFilters(families: readonly string[]) {
  const [family, setFamily] = useState(families[0]);
  const [rarities, setRarities] = useState(() => new Set<string>(rarityOrder));
  const [search, setSearch] = useState("");
  const [star, setStar] = useState(1);
  const toggleRarity = (value: string) =>
    setRarities((current) => {
      const next = new Set(current);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  return {
    family,
    setFamily,
    rarities,
    toggleRarity,
    search,
    setSearch,
    star,
    setStar,
  };
}

function RarityBadge({ rarity }: { rarity: string }) {
  return (
    <span
      className={`rarity-badge rarity-${rarity
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")}`}
    >
      {rarity}
    </span>
  );
}

export function CombatReferenceTable({
  rows,
}: {
  rows: readonly CombatReferenceRow[];
}) {
  const filters = useFilters(["Or", "Troupes/Vitesse", "Défense", "Attaque"]);
  const filtered = useMemo(
    () =>
      rows.filter(
        (row) =>
          filters.rarities.has(row.rarity) &&
          row.family === filters.family &&
          `${row.set_name} ${row.slot_type} ${row.slot_name}`
            .toLowerCase()
            .includes(filters.search.toLowerCase()),
      ),
    [rows, filters.rarities, filters.family, filters.search],
  );
  return (
    <div className="calculator-stack">
      <section className="calculator-card">
        <h2>Équipements de Combat</h2>
        <Filters
          families={["Or", "Troupes/Vitesse", "Défense", "Attaque"]}
          {...filters}
        />
      </section>
      <p className="reference-count">
        {filtered.length} ligne{filtered.length > 1 ? "s" : ""} — valeurs à{" "}
        {filters.star}★
      </p>
      <section className="calculator-card ranking-table-wrap">
        <table className="ranking-table reference-table">
          <thead>
            <tr>
              <th>Rareté</th>
              <th>Set</th>
              <th>Pouciel</th>
              <th>Gemmes</th>
              <th>Emplacement</th>
              {[1, 2, 3, 4].map((i) => (
                <th key={i}>Compétence {i}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, index) => (
              <tr
                key={`${row.rarity}-${row.set_name}-${row.slot_type}-${index}`}
              >
                <td>
                  <RarityBadge rarity={row.rarity} />
                </td>
                <td>{row.set_name}</td>
                <td>{row.skydust}</td>
                <td>{row.gem_slots}</td>
                <td>
                  {row.slot_name
                    ? `${row.slot_type} (${row.slot_name})`
                    : row.slot_type}
                </td>
                {([1, 2, 3, 4] as const).map((number) => {
                  const skill = row[`skill_${number}`];
                  const value = combatValueAtStar(
                    skill,
                    row[`value_${number}_pct`],
                    filters.star,
                  );
                  return (
                    <td key={number}>
                      {skill && skill !== "Inconnu" ? (
                        <>
                          {skill}
                          <strong className="reference-value">
                            {formatPercent(value)}
                          </strong>
                        </>
                      ) : (
                        <span className="unconfirmed">
                          À compléter en admin
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export function ExpeditionReferenceTable({
  rows,
}: {
  rows: readonly ExpeditionReferenceRow[];
}) {
  const families = ["Or", "Équipement", "Consommables", "Troupes"] as const;
  const filters = useFilters(families);
  const filtered = useMemo(
    () =>
      rows.filter(
        (row) =>
          filters.rarities.has(row.rarity) &&
          row.family === filters.family &&
          `${row.set_name} ${row.slot}`
            .toLowerCase()
            .includes(filters.search.toLowerCase()),
      ),
    [rows, filters.rarities, filters.family, filters.search],
  );
  return (
    <div className="calculator-stack">
      <section className="calculator-card">
        <h2>Équipement d’Expédition</h2>
        <p className="unconfirmed-notice">
          Pour les statistiques autres qu’Équipement et Vitalité, la projection
          par étoile est une <strong>hypothèse non confirmée</strong>.
        </p>
        <Filters families={families} {...filters} />
      </section>
      <p className="reference-count">
        {filtered.length} ligne{filtered.length > 1 ? "s" : ""} — valeurs à{" "}
        {filters.star}★
      </p>
      <section className="calculator-card ranking-table-wrap">
        <table className="ranking-table reference-table">
          <thead>
            <tr>
              <th>Rareté</th>
              <th>Set</th>
              <th>Famille</th>
              <th>Emplacement</th>
              <th>Stat de type</th>
              <th>Stat secondaire</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, index) => {
              const primary = expeditionValueAtStar(
                row.family,
                row.type_stat_pct,
                filters.star,
              );
              const secondaryName = row.secondary_stat_name.replace(
                "_expé",
                "",
              );
              const secondary = expeditionValueAtStar(
                secondaryName,
                row.secondary_stat_pct,
                filters.star,
              );
              const value = (
                result: ReturnType<typeof expeditionValueAtStar>,
              ) => (
                <>
                  <strong className="reference-value">
                    {formatPercent(result.value)}
                  </strong>
                  {result.value !== null && !result.confirmed ? (
                    <small className="unconfirmed">
                      Hypothèse non confirmée
                    </small>
                  ) : null}
                </>
              );
              return (
                <tr key={`${row.rarity}-${row.set_name}-${row.slot}-${index}`}>
                  <td>
                    <RarityBadge rarity={row.rarity} />
                  </td>
                  <td>{row.set_name}</td>
                  <td>{row.family}</td>
                  <td>{row.slot}</td>
                  <td>
                    {row.family}
                    {value(primary)}
                  </td>
                  <td>
                    {secondaryName ? (
                      <>
                        {secondaryName}
                        {value(secondary)}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export function ReferenceTables({
  combatRows,
  expeditionRows,
  availability = { combat: true, expedition: true },
}: {
  combatRows: readonly CombatReferenceRow[];
  expeditionRows: readonly ExpeditionReferenceRow[];
  availability?: Record<"combat" | "expedition", boolean>;
}) {
  const [active, setActive] = useState<"combat" | "expedition" | undefined>(
    availability.combat
      ? "combat"
      : availability.expedition
        ? "expedition"
        : undefined,
  );
  return (
    <div>
      <nav
        className="calculator-tabs tabs"
        role="tablist"
        aria-label="Référentiels"
      >
        <button
          type="button"
          role="tab"
          aria-selected={active === "combat"}
          disabled={!availability.combat}
          title={
            !availability.combat
              ? "Désactivé — inaccessible actuellement"
              : undefined
          }
          onClick={() => setActive("combat")}
        >
          Équipements de Combat
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={active === "expedition"}
          disabled={!availability.expedition}
          title={
            !availability.expedition
              ? "Désactivé — inaccessible actuellement"
              : undefined
          }
          onClick={() => setActive("expedition")}
        >
          Équipement d’Expédition
        </button>
      </nav>
      {active === "combat" ? (
        <CombatReferenceTable rows={combatRows} />
      ) : active === "expedition" ? (
        <ExpeditionReferenceTable rows={expeditionRows} />
      ) : (
        <p className="empty-state">
          Ces référentiels sont temporairement indisponibles.
        </p>
      )}
    </div>
  );
}
