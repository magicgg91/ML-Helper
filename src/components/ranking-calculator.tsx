"use client";

import { useState } from "react";
import {
  calculateRanking,
  rankingLeagues,
  type RankingConfig,
  type RankingLeague,
} from "../lib/ranking";
import { NumberStepper } from "./number-stepper";

const labels: Record<RankingLeague, string> = {
  bronze: "Bronze",
  silver: "Argent",
  gold: "Or",
  platinum: "Platine",
  diamond: "Diamant",
  legend: "Légende",
};

export function RankingCalculator({ config }: { config: RankingConfig }) {
  const [league, setLeague] = useState<RankingLeague>("diamond");
  const [percentage, setPercentage] = useState(1);
  const [rank, setRank] = useState(10);
  const bands = config[league];
  const result = calculateRanking(bands, percentage, rank);

  return (
    <div className="calculator-stack ranking-calculator">
      <section className="calculator-card">
        <div className="calculator-fields">
          <label className="calculator-field">
            Ligue
            <select
              value={league}
              onChange={(event) =>
                setLeague(event.target.value as RankingLeague)
              }
            >
              {rankingLeagues.map((item) => (
                <option key={item} value={item}>
                  {labels[item]}
                  {config[item].length === 0 ? " — à définir" : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="calculator-field">
            Ton pourcentage actuel
            <NumberStepper
              label="Ton pourcentage actuel"
              value={percentage}
              min={0}
              max={100}
              step={0.01}
              onChange={setPercentage}
            />
          </label>
          <label className="calculator-field">
            Ton rang actuel
            <NumberStepper
              label="Ton rang actuel"
              value={rank}
              min={1}
              onChange={(value) => setRank(Math.floor(value))}
            />
          </label>
        </div>
      </section>
      <section className="calculator-card">
        <div className="calculator-results">
          <div className="calculator-stat total-box">
            <span className="label">Nombre total de joueurs (déduit)</span>
            <strong className="value" data-testid="ranking-total">
              {result.total === null
                ? "—"
                : Math.round(result.total).toLocaleString("fr-FR")}
            </strong>
          </div>
        </div>
        {percentage <= 0 ? (
          <p role="status" className="ranking-placeholder">
            Saisis un pourcentage supérieur à 0 pour calculer.
          </p>
        ) : bands.length === 0 ? (
          <p role="status" className="ranking-placeholder">
            Seuils et récompenses à définir dans l’administration pour la ligue{" "}
            {labels[league]}.
          </p>
        ) : (
          <>
            <h3>Échelle visuelle</h3>
            <RankingScale bands={bands} />
            <h3>Plages de classement</h3>
            <div className="ranking-table-wrap">
              <table className="ranking-table">
                <thead>
                  <tr>
                    <th>Plage</th>
                    <th>Rang de plage</th>
                    <th>Ligue cible</th>
                    <th>Récompense</th>
                  </tr>
                </thead>
                <tbody>
                  {result.ranges.map((range) => (
                    <tr key={range.threshold}>
                      <td>
                        {range.threshold}–{range.rangeStart}%
                      </td>
                      <td>
                        {range.rankEnd.toLocaleString("fr-FR")} –{" "}
                        {range.rankStart.toLocaleString("fr-FR")}
                      </td>
                      <td
                        className={
                          range.target.startsWith("À définir")
                            ? "ranking-unknown"
                            : ""
                        }
                      >
                        {range.target}
                      </td>
                      <td
                        className={
                          range.reward.startsWith("À définir")
                            ? "ranking-unknown"
                            : ""
                        }
                      >
                        {range.reward}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function RankingScale({ bands }: { bands: RankingConfig[RankingLeague] }) {
  const sorted = [...bands].sort((a, b) => a.threshold - b.threshold);
  return (
    <div
      className="ranking-scale"
      aria-label="Échelle de classement de 100% à 0%"
    >
      <div className="ranking-axis-labels">
        <span>100%</span>
        <span>0%</span>
      </div>
      <div className="ranking-segments">
        {sorted
          .map((band, index) => {
            const start = index === 0 ? 0 : sorted[index - 1].threshold;
            return (
              <div
                key={band.threshold}
                className={`ranking-segment ranking-segment-${index % 2}`}
                style={{ width: `${band.threshold - start}%` }}
                title={`${band.threshold}–${start}% · ${band.target} · ${band.reward}`}
              >
                <span>
                  {band.threshold}–{start}%
                </span>
              </div>
            );
          })
          .reverse()}
      </div>
      <div className="ranking-ticks">
        {Array.from({ length: 11 }, (_, index) => (
          <span key={index} style={{ left: `${index * 10}%` }}>
            {100 - index * 10}%
          </span>
        ))}
      </div>
    </div>
  );
}
