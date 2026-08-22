import { describe, expect, it } from "vitest";
import {
  allocateSkillPoints,
  availableSkillPoints,
  combinedSkillPercent,
  emptySkills,
  skillPercent,
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

describe("combinedSkillPercent", () => {
  it("adds equipment and skill-points percentages for an uncapped skill", () => {
    const equipmentSkills = { ...emptySkills(), striker: 12 };
    const skillPoints = allocateSkillPoints(emptySkills(), "striker", 5, 6, "gold");
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
});
