import { expect, test, type Page } from "@playwright/test";

/**
 * Bloc 114: the Combat tool in tiles.
 *
 * This replaces e2e/bloc-88-demo-attack.spec.ts and
 * e2e/bloc-89-demo-attack.spec.ts, which measured the grey half-width result
 * tile — its 50% width, its equal thirds, its nested lighter mini-tiles. That
 * tile is gone by design: it held the target-city input among the figures the
 * input drives. The one test of theirs that outlived the layout, the league
 * auto-selection from Player Settings, is kept below.
 */

const demoTab = "Troupes en attaque démo";
const leagueGroupName = "Ligue de l’attaquant";

async function openCombat(page: Page, width: number, tab?: string) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto("/tools/combat");
  if (tab) await page.getByRole("tab", { name: tab }).click();
}

async function openDemoWithResult(page: Page, width: number) {
  await openCombat(page, width, demoTab);
  await page
    .getByRole("group", { name: leagueGroupName })
    .getByRole("button", { name: "Diamant" })
    .click();
  await page
    .getByRole("spinbutton", { name: "Niveau de ville visée" })
    .fill("135");
  await expect(page.getByTestId("demo-troops")).toHaveText("856.06G");
}

const pageOverflow = (page: Page) =>
  page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );

// Carried over from Bloc 88/A: the league is empty until the visitor has one
// in Player Settings, and is taken from there when they do (useSyncedLeague).
test("Bloc114: no league by default, auto-selects the Player Settings league", async ({
  page,
}) => {
  await openCombat(page, 1280, demoTab);
  const group = page.getByRole("group", { name: leagueGroupName });
  for (const button of await group.getByRole("button").all())
    await expect(button).toHaveAttribute("aria-pressed", "false");

  await page.addInitScript(() => {
    localStorage.setItem(
      "mlhelper_player_params",
      JSON.stringify({ equipmentSkills: {}, league: "gold" }),
    );
  });
  await openCombat(page, 1280, demoTab);
  await expect(
    page
      .getByRole("group", { name: leagueGroupName })
      .getByRole("button", { name: "Or" }),
  ).toHaveAttribute("aria-pressed", "true");
});

// Bloc 114/B: both roles at once — two columns of five, side by side on a
// desktop, and their rows line up so a rate can be read across.
test("Bloc114/B: the XP columns sit side by side with their rows aligned", async ({
  page,
}) => {
  await openCombat(page, 1280);
  await expect(page.getByTestId(/^xp-range-/)).toHaveCount(10);

  const attacker = (await page
    .getByTestId("xp-range-attacker-0")
    .boundingBox())!;
  const target = (await page.getByTestId("xp-range-target-0").boundingBox())!;
  expect(target.x, "target column is to the right").toBeGreaterThan(attacker.x);
  for (let index = 0; index < 5; index += 1) {
    const left = (await page
      .getByTestId(`xp-range-attacker-${index}`)
      .boundingBox())!;
    const right = (await page
      .getByTestId(`xp-range-target-${index}`)
      .boundingBox())!;
    expect(
      Math.abs(left.y - right.y),
      `row ${index} is not aligned across the two columns`,
    ).toBeLessThan(2);
  }
});

// The five steps are a ramp, so no two neighbours may paint the same. Reading
// the computed colors is what proves the tokens are wired at all — a class
// name alone would pass with the palette missing.
test("Bloc114/B: the attacker column paints five distinct steps", async ({
  page,
}) => {
  await openCombat(page, 1280);
  const borders: string[] = [];
  for (let index = 0; index < 5; index += 1)
    borders.push(
      await page
        .getByTestId(`xp-range-attacker-${index}`)
        .evaluate(
          (el) => getComputedStyle(el.closest(".xp-tile")!).borderTopColor,
        ),
    );
  expect(new Set(borders).size, `steps repeat: ${borders.join(", ")}`).toBe(5);
  // 3px frames, per the brief — thin enough and they read as a border.
  const width = await page
    .getByTestId("xp-range-attacker-0")
    .evaluate((el) => getComputedStyle(el.closest(".xp-tile")!).borderTopWidth);
  expect(width).toBe("3px");
});

// Bloc 114/C: the two figures are tiles of their own, the troops one violet,
// and the level that drives them is a parameter above, not a result.
test("Bloc114/C: the demo result is two tiles, the troops one highlighted", async ({
  page,
}) => {
  await openDemoWithResult(page, 1280);
  await expect(page.getByTestId("demo-wall")).toHaveText("2.85T");

  const wallTile = page.locator(".tool-tile", {
    has: page.getByTestId("demo-wall"),
  });
  const troopsTile = page.locator(".tool-tile", {
    has: page.getByTestId("demo-troops"),
  });
  await expect(troopsTile).toHaveClass(/tool-tile-highlight/);
  await expect(wallTile).not.toHaveClass(/tool-tile-highlight/);
  // Side by side, filling the row.
  const wallBox = (await wallTile.boundingBox())!;
  const troopsBox = (await troopsTile.boundingBox())!;
  expect(troopsBox.x).toBeGreaterThan(wallBox.x);
  expect(Math.abs(wallBox.y - troopsBox.y)).toBeLessThan(2);

  // The city level is in the parameters card, above the results.
  const levelBox = (await page
    .getByRole("spinbutton", { name: "Niveau de ville visée" })
    .boundingBox())!;
  expect(levelBox.y).toBeLessThan(wallBox.y);
});

// Bloc 114/A.1 + /B + /C: the phone layout, and nothing spilling off it.
test("Bloc114: the Combat tool fits a phone on both sub-tabs", async ({
  page,
}) => {
  await openCombat(page, 393);
  // The sub-tabs wrap 2 per row: 4 tabs over 2 distinct rows.
  const tabTops = await page
    .locator(".city-calculators nav.calculator-tabs [role='tab']")
    .evaluateAll((tabs) =>
      tabs.map((tab) => Math.round(tab.getBoundingClientRect().top)),
    );
  expect(tabTops).toHaveLength(4);
  expect(new Set(tabTops).size, `tab rows: ${tabTops.join(", ")}`).toBe(2);

  // The two XP columns stack, attacker first.
  const attacker = (await page
    .getByTestId("xp-range-attacker-0")
    .boundingBox())!;
  const target = (await page.getByTestId("xp-range-target-0").boundingBox())!;
  expect(target.y).toBeGreaterThan(attacker.y);
  expect(await pageOverflow(page), "XP scrolls sideways").toBeLessThanOrEqual(
    1,
  );

  await openDemoWithResult(page, 393);
  const wallBox = (await page
    .locator(".tool-tile", { has: page.getByTestId("demo-wall") })
    .boundingBox())!;
  const troopsBox = (await page
    .locator(".tool-tile", { has: page.getByTestId("demo-troops") })
    .boundingBox())!;
  // One under the other, each on the full width.
  expect(troopsBox.y).toBeGreaterThan(wallBox.y);
  expect(Math.abs(wallBox.width - troopsBox.width)).toBeLessThan(2);
  expect(await pageOverflow(page), "demo scrolls sideways").toBeLessThanOrEqual(
    1,
  );
});

// Bloc 114/A.1: the pill is drawn, filled, and is not the asterisked badge.
test("Bloc114/A: the not-yet-built sub-tabs wear a filled pill", async ({
  page,
}) => {
  await openCombat(page, 1280);
  const pill = page.locator(".tab-soon-pill").first();
  await expect(pill).toHaveText("Bientôt");
  const background = await pill.evaluate(
    (el) => getComputedStyle(el).backgroundColor,
  );
  expect(background).not.toBe("rgba(0, 0, 0, 0)");
  await expect(page.locator(".city-calculators .tab-coming-soon")).toHaveCount(
    0,
  );
});
