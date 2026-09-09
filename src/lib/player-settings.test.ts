import { describe, expect, it } from "vitest";
import {
  allocateSkillPoints,
  availableSkillPoints,
  combinedSkillPercent,
  emptySkills,
  emptyTemplars,
  skillCapForLeague,
  skillPercent,
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
    expect(templePercent("rusher", clanTemple)).toBe(templeBase.rusher + 260);
  });

  it("still returns the temple base alone when no clan contribution is entered", () => {
    expect(templePercent("striker", emptyTemplars())).toBe(templeBase.striker);
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
    });
    expect(skillCapForLeague("striker", "gold")).toBeUndefined();
    expect(breakdown.total).toBe(500 + templeBase.striker);
  });
});
