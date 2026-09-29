import { describe, expect, it } from "vitest";
import {
  allocateSkillPoints,
  availableSkillPoints,
  combinedSkillPercent,
  emptySkills,
  emptyTemplars,
  skillCapForLeague,
  skillPercent,
  templarKeys,
  templeBase,
  templePercent,
  templeSkillBreakdown,
} from "./player-settings";

describe("player skill-point planning", () => {
  it("derives the budget from level and league", () => {
    expect(availableSkillPoints(11, "")).toBe(0);
    expect(availableSkillPoints(11, "gold")).toBe(10);
    expect(availableSkillPoints(11, "legend")).toBe(20);
  });

  it("fills a prerequisite before allocating the requested skill", () => {
    const result = allocateSkillPoints(
      emptySkills(),
      "scavenger",
      4,
      10,
      "gold",
    );
    expect(result.striker).toBe(5);
    expect(result.scavenger).toBe(4);
  });

  it("falls back to the maximum prerequisite when the budget is insufficient", () => {
    const result = allocateSkillPoints(emptySkills(), "rusher", 2, 7, "gold");
    expect(result.recruiter).toBe(6);
    expect(result.rusher).toBe(0);
  });

  it("enforces the global budget and percentage caps", () => {
    const result = allocateSkillPoints(
      emptySkills(),
      "striker",
      999,
      6,
      "legend",
    );
    expect(result.striker).toBe(10);

    result.fearless = 100;
    expect(skillPercent("fearless", result, "legend")).toBe(75);
    expect(skillPercent("fearless", result, "diamond")).toBe(90);
  });
});

describe("skillCapForLeague", () => {
  it("has no cap for the 7 skills without a confirmed ceiling", () => {
    for (const key of [
      "striker",
      "guardian",
      "scavenger",
      "salvager",
      "prosperous",
      "recruiter",
      "rusher",
    ] as const) {
      expect(skillCapForLeague(key, "legend")).toBeUndefined();
    }
  });

  it("caps Récupération at 50% in every league", () => {
    for (const league of ["", "bronze", "gold", "diamond", "legend"] as const) {
      expect(skillCapForLeague("cautious", league)).toBe(50);
    }
  });

  it("caps Intrépide/Bravoure at 90% outside Légende and 75% in Légende", () => {
    for (const key of ["fearless", "brave"] as const) {
      expect(skillCapForLeague(key, "bronze")).toBe(90);
      expect(skillCapForLeague(key, "diamond")).toBe(90);
      expect(skillCapForLeague(key, "")).toBe(90);
      expect(skillCapForLeague(key, "legend")).toBe(75);
    }
  });
});

describe("combinedSkillPercent", () => {
  it("adds equipment and skill-points percentages for an uncapped skill", () => {
    const equipmentSkills = { ...emptySkills(), striker: 12 };
    const skillPoints = allocateSkillPoints(
      emptySkills(),
      "striker",
      5,
      6,
      "gold",
    );
    expect(
      combinedSkillPercent("striker", {
        equipmentSkills,
        skillPoints,
        league: "gold",
      }),
    ).toBe(12 + skillPercent("striker", skillPoints, "gold"));
  });

  it("caps the combined total at 90% for Bravoure/Intrépide even if the sum exceeds it", () => {
    const equipmentSkills = { ...emptySkills(), fearless: 80 };
    const skillPoints = { ...emptySkills(), fearless: 20 };
    expect(
      combinedSkillPercent("fearless", {
        equipmentSkills,
        skillPoints,
        league: "diamond",
      }),
    ).toBe(90);
  });

  it("caps the combined total at 75% for Bravoure/Intrépide in Légende", () => {
    const equipmentSkills = { ...emptySkills(), brave: 70 };
    const skillPoints = { ...emptySkills(), brave: 20 };
    expect(
      combinedSkillPercent("brave", {
        equipmentSkills,
        skillPoints,
        league: "legend",
      }),
    ).toBe(75);
  });

  it("caps the combined total at 50% for Récupération even if the sum exceeds it", () => {
    const equipmentSkills = { ...emptySkills(), cautious: 45 };
    const skillPoints = { ...emptySkills(), cautious: 10 };
    expect(
      combinedSkillPercent("cautious", {
        equipmentSkills,
        skillPoints,
        league: "gold",
      }),
    ).toBe(50);
  });

  it("does not cap Récupération below its 50% ceiling", () => {
    const equipmentSkills = { ...emptySkills(), cautious: 20 };
    const skillPoints = { ...emptySkills(), cautious: 0 };
    expect(
      combinedSkillPercent("cautious", {
        equipmentSkills,
        skillPoints,
        league: "gold",
      }),
    ).toBe(20);
  });
});

describe("templePercent", () => {
  it("adds the confirmed temple base to the clan's Templar contribution", () => {
    const clanTemple = { ...emptyTemplars(), rusher: 260 };
    expect(templePercent("rusher", { clanTemple, includeTemples: true })).toBe(
      templeBase.rusher + 260,
    );
  });

  it("still returns the temple base alone when no clan contribution is entered", () => {
    expect(
      templePercent("striker", {
        clanTemple: emptyTemplars(),
        includeTemples: true,
      }),
    ).toBe(templeBase.striker);
  });

  /**
   * Bloc 144 : l'interrupteur « Temples ». La règle vit ICI et nulle part
   * ailleurs — base de temple ET contribution du clan tombent ensemble, pour
   * les cinq compétences concernées, sans qu'aucun outil n'ait à le savoir.
   */
  describe("temples exclus", () => {
    const clanTemple = {
      striker: 53.5,
      guardian: 52.25,
      prosperous: 99.5,
      recruiter: 105,
      rusher: 216,
    };

    it("renvoie zéro pour chacune des cinq compétences de temple", () => {
      for (const key of templarKeys) {
        expect(
          templePercent(key, { clanTemple, includeTemples: false }),
          key,
        ).toBe(0);
      }
    });

    it("rend exactement la même valeur qu'avant une fois réactivé", () => {
      for (const key of templarKeys) {
        expect(
          templePercent(key, { clanTemple, includeTemples: true }),
          key,
        ).toBe(templeBase[key] + clanTemple[key]);
      }
    });

    // La base de temple est le piège : elle s'ajoute automatiquement, donc une
    // exclusion qui ne retirerait que la contribution du clan laisserait 20 à
    // 50 % en place sans que rien ne le montre.
    it("retire aussi la base de temple, pas seulement la part du clan", () => {
      expect(
        templePercent("rusher", {
          clanTemple: emptyTemplars(),
          includeTemples: false,
        }),
      ).toBe(0);
      expect(templeBase.rusher).toBeGreaterThan(0);
    });
  });
});

describe("templeSkillBreakdown", () => {
  it("combines equipment, points and temple (base + clan) into a single total", () => {
    const equipmentSkills = { ...emptySkills(), striker: 12 };
    const skillPoints = allocateSkillPoints(
      emptySkills(),
      "striker",
      5,
      6,
      "gold",
    );
    const clanTemple = { ...emptyTemplars(), striker: 260 };
    const breakdown = templeSkillBreakdown("striker", {
      equipmentSkills,
      skillPoints,
      clanTemple,
      league: "gold",
      includeTemples: true,
    });
    expect(breakdown.equipment).toBe(12);
    expect(breakdown.points).toBe(skillPercent("striker", skillPoints, "gold"));
    expect(breakdown.temple).toBe(templeBase.striker + 260);
    expect(breakdown.total).toBe(
      breakdown.equipment + breakdown.points + breakdown.temple,
    );
  });

  it("applies the league cap to the final total, not to the individual components", () => {
    // None of the 5 temple skills has a confirmed cap today, but the
    // breakdown must still cap the total (not equipment/points/temple
    // individually) so a future cap can't be bypassed by componentizing.
    const breakdown = templeSkillBreakdown("striker", {
      equipmentSkills: { ...emptySkills(), striker: 500 },
      skillPoints: emptySkills(),
      clanTemple: emptyTemplars(),
      league: "gold",
      includeTemples: true,
    });
    expect(skillCapForLeague("striker", "gold")).toBeUndefined();
    expect(breakdown.total).toBe(500 + templeBase.striker);
  });

  // Bloc 144 : la décomposition suit l'interrupteur sans le lire elle-même —
  // elle passe par templePercent, donc il n'y a qu'un endroit à changer le
  // jour où la règle bouge.
  it("Bloc144: met la part de temple à zéro et la retire du total, temples exclus", () => {
    const settings = {
      equipmentSkills: { ...emptySkills(), striker: 527 },
      skillPoints: emptySkills(),
      clanTemple: { ...emptyTemplars(), striker: 53.5 },
      league: "diamond" as const,
    };
    const included = templeSkillBreakdown("striker", {
      ...settings,
      includeTemples: true,
    });
    const excluded = templeSkillBreakdown("striker", {
      ...settings,
      includeTemples: false,
    });

    expect(included.temple).toBe(templeBase.striker + 53.5);
    expect(excluded.temple).toBe(0);
    // Équipement et points sont intouchés : seul le troisième terme tombe.
    expect(excluded.equipment).toBe(included.equipment);
    expect(excluded.points).toBe(included.points);
    expect(excluded.total).toBe(included.total - included.temple);
  });

  /*
    Une compétence sans temple ne doit rien voir changer : c'est la moitié du
    tableau (Bravoure, Charognard, Intrépide, Récupération, Recycleur). Elles
    ne passent pas par templeSkillBreakdown mais par combinedSkillPercent, qui
    ne reçoit même pas le drapeau — l'indifférence est structurelle, et le
    compilateur la tient. Ce test le constate côté valeur.
  */
  it("Bloc144: les compétences hors temple valent équipement + points, quoi qu'il arrive", () => {
    const shared = {
      equipmentSkills: { ...emptySkills(), scavenger: 246 },
      skillPoints: allocateSkillPoints(
        emptySkills(),
        "striker",
        5,
        20,
        "diamond",
      ),
      league: "diamond" as const,
    };
    expect(combinedSkillPercent("scavenger", shared)).toBe(
      shared.equipmentSkills.scavenger +
        skillPercent("scavenger", shared.skillPoints, shared.league),
    );
    expect(templarKeys).not.toContain("scavenger");
  });
});
