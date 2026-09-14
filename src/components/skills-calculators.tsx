"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  defaultGemParameters,
  type GemParameters,
} from "../lib/gem-parameters";
import {
  defaultTemplarParameters,
  type TemplarParameters,
} from "../lib/templar-parameters";
import type {
  CombatReferenceRow,
  ExpeditionReferenceRow,
  ExpeditionStarIncrements,
} from "../lib/reference-equipment";
import { defaultExpeditionStarIncrements } from "../lib/reference-equipment";
import {
  equipmentStarIncrement,
  type EquipmentStarIncrements,
} from "../lib/equipment";
import { StuffSimulator } from "./equipment-tools";
import { ExpeditionEquipmentSimulator } from "./expedition-equipment-tools";
import { TabList, TabPanel } from "./tabs";
import { GemsCalculator } from "./gems-calculator";
import { TemplarsCalculator } from "./templars-calculator";

export function SkillsCalculators({
  templarParameters = defaultTemplarParameters,
  combatRows,
  combatIncrements = equipmentStarIncrement,
  expeditionRows,
  expeditionIncrements = defaultExpeditionStarIncrements,
  gemParameters = defaultGemParameters,
  availability = {
    simulator: true,
    gems: true,
    templars: true,
    expedition: true,
  },
  // Bloc 53/F: a reference's cross-link to this category (Gems, Templars)
  // now passes ?open=<tab> so it lands directly on the precise calculator
  // instead of always defaulting to whichever tab is firstAvailable.
  initialTool,
}: {
  templarParameters?: TemplarParameters;
  combatRows: readonly CombatReferenceRow[];
  combatIncrements?: EquipmentStarIncrements;
  expeditionRows: readonly ExpeditionReferenceRow[];
  expeditionIncrements?: ExpeditionStarIncrements;
  gemParameters?: GemParameters;
  availability?: Record<
    "simulator" | "gems" | "templars" | "expedition",
    boolean
  >;
  initialTool?: "simulator" | "gems" | "templars" | "expedition";
}) {
  const tools = useTranslations("tools");
  const simulator = useTranslations("stuff-simulator");
  const gems = useTranslations("gems");
  const templars = useTranslations("templars");
  const expedition = useTranslations("expedition-equipment-simulator");
  // Order (Bloc 31/C): Combat Equipment, Expedition Equipment, Gems, Templars.
  const firstAvailable = (
    ["simulator", "expedition", "gems", "templars"] as const
  ).find((key) => availability[key]);
  const [active, setActive] = useState<
    "simulator" | "gems" | "templars" | "expedition" | undefined
  >(initialTool && availability[initialTool] ? initialTool : firstAvailable);
  return (
    <div className="city-calculators">
      <TabList
        idPrefix="skills-tools"
        label={tools("skills-tabs")}
        active={active}
        onSelect={setActive}
        tabs={[
          // Order (Bloc 31/C): Combat Equipment, Expedition Equipment, Gems,
          // Templars.
          { key: "simulator" as const, label: simulator("name") },
          { key: "expedition" as const, label: expedition("name") },
          { key: "gems" as const, label: gems("name") },
          { key: "templars" as const, label: templars("name") },
        ].map((tab) => ({
          ...tab,
          available: availability[tab.key],
          unavailableLabel: tools("calculator-unavailable"),
        }))}
      />
      {active === "simulator" ? (
        <TabPanel idPrefix="skills-tools" tabKey="simulator">
          <StuffSimulator
            combatRows={combatRows}
            gemParameters={gemParameters}
            increments={combatIncrements}
          />
        </TabPanel>
      ) : active === "expedition" ? (
        <TabPanel idPrefix="skills-tools" tabKey="expedition">
          <ExpeditionEquipmentSimulator
            rows={expeditionRows}
            increments={expeditionIncrements}
          />
        </TabPanel>
      ) : active === "gems" ? (
        <TabPanel idPrefix="skills-tools" tabKey="gems">
          <GemsCalculator parameters={gemParameters} />
        </TabPanel>
      ) : active === "templars" ? (
        <TabPanel idPrefix="skills-tools" tabKey="templars">
          <TemplarsCalculator parameters={templarParameters} />
        </TabPanel>
      ) : (
        <p className="empty-state">{tools("calculators-unavailable")}</p>
      )}
    </div>
  );
}
