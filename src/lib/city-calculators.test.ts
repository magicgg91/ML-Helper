import { describe, expect, it } from "vitest";
import {
  calculateProduction,
  cityStatsAt,
  cityUpgradeCost,
  cumulativeCostAt,
  maximumReachableLevel,
  upgradeCostAt,
} from "./city-calculators";

describe("city formulas", () => {
  it("uses the confirmed Legend geometric formulas", () => {
    expect(cityStatsAt(1)).toEqual({ vp: 20, wall: 70, gold: 200, army: 60 });
    expect(cityStatsAt(2).vp).toBeCloseTo(22.3);
    expect(upgradeCostAt(1)).toBe(0);
    expect(upgradeCostAt(2)).toBe(10);
    expect(upgradeCostAt(3)).toBe(12);
    expect(cumulativeCostAt(3)).toBe(22);
    expect(cityUpgradeCost(1, 3)).toBe(22);
  });

  it("finds the maximum level iteratively and keeps the remainder", () => {
    expect(maximumReachableLevel(1, 2, 43)).toEqual({
      level: 2,
      spent: 20,
      remaining: 23,
    });
    expect(maximumReachableLevel(1, 2, 44)).toEqual({
      level: 3,
      spent: 44,
      remaining: 0,
    });
  });

  it("separates base, stuff and temple and bases rewards on base only", () => {
    const result = calculateProduction({
      cityCount: 2,
      cityLevel: 1,
      playerLevel: 11,
      league: "legend",
      prosperousEquipment: 10,
      recruiterEquipment: 20,
      prosperousTemple: 30,
      recruiterTemple: 50,
      goldRewardHours: 5,
      troopsRewardHours: 2,
    });
    expect(result.gold).toEqual({
      base: 400,
      stuff: 40,
      temple: 120,
      total: 560,
    });
    expect(result.troops).toEqual({
      base: 120,
      stuff: 24,
      temple: 60,
      total: 204,
    });
    expect(result.rewards).toEqual({ gold: 2000, troops: 240 });
    expect(result.fullProduction).toEqual({
      points: 20,
      gold: 640,
      troops: 192,
    });
  });
});
