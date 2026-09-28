import { describe, expect, it } from "vitest";
import {
  bonusBreakdown,
  calculateProduction,
  calculateReward,
  cityStatsAt,
  cityUpgradeCost,
  cumulativeCostAt,
  maximumReachableLevel,
  upgradeCostAt,
} from "./city-calculators";
import { defaultCityParameters } from "./city-parameters";

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

  it.each([
    ["bronze", 40, 100],
    ["silver", 45, 125],
    ["gold", 55, 175],
    ["platinum", 55, 175],
    ["diamond", 60, 200],
    ["legend", 60, 200],
  ] as const)(
    "uses the confirmed Army and Gold multipliers for %s",
    (league, army, gold) => {
      expect(cityStatsAt(1, league, defaultCityParameters)).toEqual({
        vp: 20,
        wall: 70,
        army,
        gold,
      });
    },
  );

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

  it("separates the gold and troops production into base, stuff and temple", () => {
    const result = calculateProduction({
      cityCount: 2,
      cityLevel: 1,
      playerLevel: 11,
      league: "legend",
      prosperousEquipment: 10,
      recruiterEquipment: 20,
      prosperousTemple: 30,
      recruiterTemple: 50,
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
    // Bloc 115 : ces deux valeurs décrivaient le défaut. `640` et `192`
    // étaient la base nue multipliée par les seuls points (400 × 1,6 et
    // 120 × 1,6) — équipement et temple perdus. `192` était même *inférieur*
    // aux 204 de la production normale juste au-dessus : un reskill complet
    // affiché comme une perte.
    //
    // Attendu maintenant, avec la même décomposition que la production
    // normale : 400 × (1 + (10 + 30 + 60)/100) et 120 × (1 + (20 + 50 + 60)/100).
    expect(result.fullProduction).toEqual({
      points: 20,
      gold: 800,
      troops: 276,
    });
  });
});

/**
 * Bloc 115 : la simulation « Si reskill full-prod », vérifiée **par
 * différence** plutôt que sur des nombres figés.
 *
 * Le défaut corrigé ici tenait à ce que la simulation multipliait la base nue :
 * elle perdait l'équipement et le temple, et pouvait donc annoncer moins que la
 * production courante. Comparer sa sortie à la production normale recalculée
 * avec tout le budget en Recruteur/Prospérité rend cet écart impossible à
 * réintroduire sans qu'un test tombe — une valeur figée, elle, se met à jour
 * sans rien prouver.
 */
describe("Bloc 115 : full-prod = production normale avec tout le budget", () => {
  const profiles = [
    { name: "débutant", playerLevel: 2, league: "bronze" as const },
    { name: "milieu de partie", playerLevel: 40, league: "gold" as const },
    { name: "le profil du joueur", playerLevel: 95, league: "diamond" as const },
    { name: "haut niveau", playerLevel: 150, league: "legend" as const },
  ];
  // Équipement et temple variés, dont un couple à zéro pour que la preuve ne
  // dépende pas de leur présence.
  const bonuses = [
    { prosperousEquipment: 0, recruiterEquipment: 0, prosperousTemple: 0, recruiterTemple: 0 },
    { prosperousEquipment: 602, recruiterEquipment: 602, prosperousTemple: 30, recruiterTemple: 30 },
    { prosperousEquipment: 45, recruiterEquipment: 310, prosperousTemple: 80, recruiterTemple: 0 },
  ];

  const inputFor = (
    profile: (typeof profiles)[number],
    bonus: (typeof bonuses)[number],
  ) => ({ cityCount: 49, cityLevel: 30, ...profile, ...bonus });

  it.each(profiles)(
    "$name : l'armée full-prod vaut la production normale avec tout le budget en Recruteur",
    (profile) => {
      for (const bonus of bonuses) {
        const input = inputFor(profile, bonus);
        const result = calculateProduction(input);
        // La référence : la même décomposition que la production normale, avec
        // le pourcentage de tout le budget ajouté à l'équipement.
        const allPoints = result.fullProduction.points * 3;
        const reference = bonusBreakdown(
          result.troops.base,
          bonus.recruiterEquipment + allPoints,
          bonus.recruiterTemple,
        ).total;
        expect(result.fullProduction.troops).toBeCloseTo(reference, 6);
      }
    },
  );

  it.each(profiles)(
    "$name : l'or full-prod vaut la production normale avec tout le budget en Prospérité",
    (profile) => {
      for (const bonus of bonuses) {
        const input = inputFor(profile, bonus);
        const result = calculateProduction(input);
        const allPoints = result.fullProduction.points * 3;
        const reference = bonusBreakdown(
          result.gold.base,
          bonus.prosperousEquipment + allPoints,
          bonus.prosperousTemple,
        ).total;
        expect(result.fullProduction.gold).toBeCloseTo(reference, 6);
      }
    },
  );

  it("n'est jamais inférieur à la production normale dès qu'il reste du budget", () => {
    for (const profile of profiles) {
      for (const bonus of bonuses) {
        const result = calculateProduction(inputFor(profile, bonus));
        expect(result.fullProduction.points).toBeGreaterThan(0);
        expect(result.fullProduction.troops).toBeGreaterThanOrEqual(
          result.troops.total,
        );
        expect(result.fullProduction.gold).toBeGreaterThanOrEqual(
          result.gold.total,
        );
      }
    }
  });

  it("garde l'équipement et le temple dans le total", () => {
    const withBonus = calculateProduction(
      inputFor(profiles[2], {
        prosperousEquipment: 602,
        recruiterEquipment: 602,
        prosperousTemple: 30,
        recruiterTemple: 30,
      }),
    );
    const without = calculateProduction(
      inputFor(profiles[2], {
        prosperousEquipment: 0,
        recruiterEquipment: 0,
        prosperousTemple: 0,
        recruiterTemple: 0,
      }),
    );
    // L'écart entre les deux est exactement la part apportée par l'équipement
    // et le temple, sur la même base.
    const base = withBonus.troops.base;
    expect(withBonus.fullProduction.troops - without.fullProduction.troops).toBeCloseTo(
      base * ((602 + 30) / 100),
      6,
    );
    expect(withBonus.fullProduction.gold - without.fullProduction.gold).toBeCloseTo(
      withBonus.gold.base * ((602 + 30) / 100),
      6,
    );
  });

  it("n'écrête jamais, même avec un budget démesuré", () => {
    const small = calculateProduction(
      inputFor({ name: "x", playerLevel: 100, league: "legend" }, bonuses[1]),
    );
    const huge = calculateProduction(
      inputFor({ name: "x", playerLevel: 5000, league: "legend" }, bonuses[1]),
    );
    expect(huge.fullProduction.points).toBeGreaterThan(small.fullProduction.points);
    expect(huge.fullProduction.troops).toBeGreaterThan(small.fullProduction.troops);
    expect(huge.fullProduction.gold).toBeGreaterThan(small.fullProduction.gold);
    // Et le total suit bien le budget, sans palier : la simulation reste
    // linéaire en points (Prospérité et Recruteur n'ont pas de plafond,
    // `skillPointMeta` leur donne `cap: null`).
    expect(huge.fullProduction.troops).toBeCloseTo(
      bonusBreakdown(
        huge.troops.base,
        bonuses[1].recruiterEquipment + huge.fullProduction.points * 3,
        bonuses[1].recruiterTemple,
      ).total,
      6,
    );
  });

  it("ne confond pas les deux compétences : Armée suit Recruteur, Or suit Prospérité", () => {
    // Équipements volontairement dissymétriques : une permutation des deux
    // compétences se verrait immédiatement.
    const result = calculateProduction(
      inputFor(profiles[2], {
        prosperousEquipment: 10,
        recruiterEquipment: 900,
        prosperousTemple: 0,
        recruiterTemple: 0,
      }),
    );
    const points = result.fullProduction.points * 3;
    expect(result.fullProduction.troops).toBeCloseTo(
      bonusBreakdown(result.troops.base, 900 + points, 0).total,
      6,
    );
    expect(result.fullProduction.gold).toBeCloseTo(
      bonusBreakdown(result.gold.base, 10 + points, 0).total,
      6,
    );
  });
});

describe("calculateReward", () => {
  it("multiplies the base production by the hours received", () => {
    expect(calculateReward(1, 25)).toBe(25);
    expect(calculateReward(2000, 5)).toBe(10000);
  });

  it("returns zero when no hours were received", () => {
    expect(calculateReward(2000, 0)).toBe(0);
  });

  it("returns zero when the base production is zero", () => {
    expect(calculateReward(0, 25)).toBe(0);
  });
});

describe("bonusBreakdown", () => {
  it("splits a base value into its equipment and temple contributions", () => {
    expect(bonusBreakdown(200, 10, 30)).toEqual({
      base: 200,
      stuff: 20,
      temple: 60,
      total: 280,
    });
  });
  it("ignores negative percentages instead of subtracting from the base", () => {
    expect(bonusBreakdown(100, -5, -10)).toEqual({
      base: 100,
      stuff: 0,
      temple: 0,
      total: 100,
    });
  });
});
