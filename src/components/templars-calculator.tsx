"use client";

// Bloc 93/M8: the Templiers calculator, moved out of skills-calculators.tsx
// alongside the Gemmes one. Behaviour and markup unchanged.

import { ResultTile } from "./result-tile";
import { useTranslations } from "next-intl";
import { useState, type CSSProperties } from "react";
import { formatGameNumber } from "../lib/format";
import { skillColor } from "../lib/game-images";
import { CrossReferenceLink } from "./cross-reference-link";
import { GameImage } from "./game-image";
import { referenceCatalog, referenceHref } from "../lib/reference-catalog";
import { templarRates, templarUpgradeCost } from "../lib/gems-templars";
import { type TemplarParameters } from "../lib/templar-parameters";
import { defaultTemplarPresentationCatalog } from "../lib/templars-presentation";
import { templarKeys, type TemplarKey } from "../lib/player-settings";
import { NumberStepper } from "./number-stepper";

function TemplarResultTile({
  templarKey,
  start,
  target,
}: {
  templarKey: TemplarKey;
  start: number;
  target: number;
}) {
  const t = useTranslations("templars");
  const game = useTranslations("game");
  const rate = templarRates[templarKey];
  const gain = (target - start) * rate;
  const row = defaultTemplarPresentationCatalog[templarKey];
  const color = skillColor(templarKey);
  const name = game(`templars.${templarKey}`);
  return (
    <article
      className="templars-tile"
      data-testid={`templars-calculator-tile-${templarKey}`}
      style={
        {
          borderColor: color,
          background: `color-mix(in srgb, ${color} 14%, var(--surface))`,
        } as CSSProperties
      }
    >
      <GameImage
        src={row.image}
        alt={name}
        className="templars-tile-image"
        width={1000}
        height={1353}
        fallback={null}
      />
      <div className="templars-tile-body">
        <h2 className="templars-tile-title">
          {t("presentation.tile-title", { name })}
        </h2>
        <p className="templars-tile-stat">
          {t("bonus-per-templar")} : {t("rate-value", { rate })}
        </p>
        <p className="templars-tile-stat">
          {t("total-bonus")} : {`${target * rate}%`}
        </p>
        <p className="templars-tile-stat">
          {t("gain")} : {`${gain >= 0 ? "+" : ""}${gain}%`}
        </p>
      </div>
    </article>
  );
}

export function TemplarsCalculator({
  parameters,
}: {
  parameters: TemplarParameters;
}) {
  const t = useTranslations("templars");
  const crossReference = useTranslations("crossReference");
  const references = useTranslations("references");
  const [start, setStart] = useState(0);
  const [target, setTarget] = useState(1);
  const cost = templarUpgradeCost(start, target, parameters);
  const reference = referenceCatalog.find((item) => item.slug === "templars")!;
  return (
    <div className="calculator-stack">
      {/* Bloc 68/C: fields + cost total merged into one 3-equal-column
          card on desktop (dedicated .templars-cost-fields, not the shared
          .calculator-fields used by Gems/City/DemoAttackTroops), stacking
          to 1 column on mobile via the same class's own media query. */}
      <section className="calculator-card">
        <div className="templars-cost-fields">
          <label className="calculator-field">
            {t("fields.start-level")}
            <NumberStepper
              label={t("fields.start-level")}
              value={start}
              min={0}
              // Bloc69/C review fix: capped one below target's own max=20
              // (mirroring the City tool's start=199/target=200 headroom) so
              // "start+1" committed below can never exceed target's max and
              // silently push it to 21.
              max={19}
              onChange={(value) => setStart(Math.floor(value))}
              // Bloc 69/C: same "must be > start" floor as the City tool
              // (Bloc 34/C) — only enforced at commit time (blur, +/-
              // buttons), not on every keystroke.
              onCommit={(v) => {
                const nextStart = Math.floor(v);
                setStart(nextStart);
                setTarget((current) =>
                  current <= nextStart ? nextStart + 1 : current,
                );
              }}
            />
          </label>
          <label className="calculator-field">
            {t("fields.target-level")}
            <NumberStepper
              label={t("fields.target-level")}
              value={target}
              min={1}
              max={20}
              onChange={(value) => setTarget(Math.floor(value))}
              onCommit={(v) => {
                const nextTarget = Math.floor(v);
                setTarget(nextTarget <= start ? start + 1 : nextTarget);
              }}
            />
          </label>
          <ResultTile
            label={t("total-cost")}
            value={`${formatGameNumber(cost)} ${t("skydust")}`}
            testId="templar-cost"
          />
        </div>
      </section>
      {/* Bloc 68/C: results as tiles (same visual pattern as the
          referentiel's presentation tiles), replacing the old table. */}
      <section className="calculator-card">
        {/* Bloc 92/H1: the tiles recompute silently on every level change —
            a live region announces the updated result to screen readers. */}
        <div aria-live="polite">
          <div className="templars-tile-grid">
            {templarKeys.map((key) => (
              <TemplarResultTile
                key={key}
                templarKey={key}
                start={start}
                target={target}
              />
            ))}
          </div>
        </div>
      </section>
      {/* Bloc 55/A: after the tool's own content, not before it. */}
      <CrossReferenceLink
        href={referenceHref("templars")}
        title={references(`catalog.${reference.slug}`)}
        image={reference.image}
        fallbackImage={reference.fallbackImage}
        label={crossReference("toReference")}
      />
    </div>
  );
}
