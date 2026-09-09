import { prisma } from "./prisma";
import { defaultCityParameters, parseCityParameters } from "./city-parameters";
import {
  defaultTemplarParameters,
  parseTemplarParameters,
} from "./templar-parameters";
import {
  defaultDemoPercentages,
  defaultXpTiers,
  parseDemoPercentages,
  parseXpTiers,
} from "./combat-calculators";
import { defaultLevelUpParameters, parseLevelUpParameters } from "./level-up";
import { defaultGemParameters, parseGemParameters } from "./gem-parameters";

async function formulaParams(calculatorSlug: string, key: string) {
  return prisma.formula.findFirst({
    where: { calculator: { slug: calculatorSlug }, key },
    select: { formulaParams: true },
  });
}

export async function getCityParameters() {
  const formula = await formulaParams("city-cost", "city_parameters");
  return formula
    ? parseCityParameters(formula.formulaParams)
    : structuredClone(defaultCityParameters);
}

export async function getTemplarParameters() {
  const formula = await formulaParams("templars", "templar_cost");
  return formula
    ? parseTemplarParameters(formula.formulaParams)
    : { ...defaultTemplarParameters };
}

export async function getCombatParameters() {
  const [xp, demo] = await Promise.all([
    formulaParams("xp-gain-rate", "xp_gain_tiers"),
    formulaParams("demo-attack-troops", "demo_attack_percentages"),
  ]);
  return {
    xpTiers: xp
      ? parseXpTiers(xp.formulaParams)
      : structuredClone(defaultXpTiers),
    demoPercentages: demo
      ? parseDemoPercentages(demo.formulaParams)
      : { ...defaultDemoPercentages },
  };
}

export async function getXpGainTiers() {
  const formula = await formulaParams("xp-gain-rate", "xp_gain_tiers");
  return formula
    ? parseXpTiers(formula.formulaParams)
    : structuredClone(defaultXpTiers);
}

export async function getDemoPercentages() {
  const formula = await formulaParams(
    "demo-attack-troops",
    "demo_attack_percentages",
  );
  return formula
    ? parseDemoPercentages(formula.formulaParams)
    : { ...defaultDemoPercentages };
}

export async function getLevelUpParameters() {
  const formula = await formulaParams("level-up", "level_up_parameters");
  return formula
    ? parseLevelUpParameters(formula.formulaParams)
    : structuredClone(defaultLevelUpParameters);
}

export async function getGemParameters() {
  const formula = await formulaParams("gems", "gem_parameters");
  return formula
    ? parseGemParameters(formula.formulaParams)
    : structuredClone(defaultGemParameters);
}
