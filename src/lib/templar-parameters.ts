export type TemplarParameters = { base: number; ratio: number };
export const defaultTemplarParameters: TemplarParameters = { base: 150, ratio: 1.3 };

export function parseTemplarParameters(value: unknown): TemplarParameters {
  if (!value || typeof value !== "object") return { ...defaultTemplarParameters };
  const source = value as Partial<TemplarParameters>;
  const base = Number(source.base), ratio = Number(source.ratio);
  return {
    base: Number.isFinite(base) && base > 0 ? base : defaultTemplarParameters.base,
    ratio: Number.isFinite(ratio) && ratio > 0 ? ratio : defaultTemplarParameters.ratio,
  };
}

export function templarLevelCost(level: number, parameters: TemplarParameters = defaultTemplarParameters) {
  if (level < 1) return 0;
  return Math.round(parameters.base * parameters.ratio ** (Math.floor(level) - 1));
}

