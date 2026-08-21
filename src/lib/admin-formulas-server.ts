import { prisma } from "./prisma";
import { defaultCityParameters, parseCityParameters } from "./city-parameters";
import { defaultTemplarParameters, parseTemplarParameters } from "./templar-parameters";

async function formulaParams(calculatorSlug: string, key: string) {
  return prisma.formula.findFirst({ where: { calculator: { slug: calculatorSlug }, key }, select: { formulaParams: true } });
}

export async function getCityParameters() {
  const formula = await formulaParams("city-cost", "city_parameters");
  return formula ? parseCityParameters(formula.formulaParams) : structuredClone(defaultCityParameters);
}

export async function getTemplarParameters() {
  const formula = await formulaParams("templars", "templar_cost");
  return formula ? parseTemplarParameters(formula.formulaParams) : { ...defaultTemplarParameters };
}
