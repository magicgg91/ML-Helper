import { expect, test } from "@playwright/test";

const demoTab = "Troupes en attaque démo";
const leagueGroupName = "Ligue de l’attaquant";

async function openDemo(page: import("@playwright/test").Page, width = 1280) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto("/tools/combat");
  await page.getByRole("tab", { name: demoTab }).click();
}

// Bloc 88/A: the league block stays full-width; its buttons take 50% of it
// on desktop and the 2x3 grid on mobile. Auto-selection from Player Settings
// is unchanged (none by default, the configured league otherwise).
test("Bloc 88/A: league buttons are 50% of the full-width block on desktop", async ({
  page,
}) => {
  await openDemo(page, 1280);
  const buttons = page.locator(
    ".demo-attack-league-field .league-buttons-half",
  );
  await expect(buttons).toBeVisible();
  const ratio = () =>
    buttons.evaluate((el) => {
      const parent = el.parentElement!;
      const s = getComputedStyle(parent);
      const content =
        parent.clientWidth -
        parseFloat(s.paddingLeft) -
        parseFloat(s.paddingRight);
      return el.getBoundingClientRect().width / content;
    });
  const desktop = await ratio();
  expect(desktop).toBeGreaterThan(0.45);
  expect(desktop).toBeLessThan(0.55);

  await page.setViewportSize({ width: 480, height: 900 });
  expect(await ratio()).toBeGreaterThan(0.9);
});

test("Bloc 88/A: no league by default, auto-selects the Player Settings league", async ({
  page,
}) => {
  await openDemo(page, 1280);
  const group = page.getByRole("group", { name: leagueGroupName });
  for (const button of await group.getByRole("button").all())
    await expect(button).toHaveAttribute("aria-pressed", "false");

  await page.addInitScript(() => {
    localStorage.setItem(
      "mlhelper_player_params",
      JSON.stringify({ equipmentSkills: {}, league: "gold" }),
    );
  });
  await openDemo(page, 1280);
  await expect(
    page.getByRole("group", { name: leagueGroupName }).getByRole("button", {
      name: "Or",
    }),
  ).toHaveAttribute("aria-pressed", "true");
});

// Bloc 88/B: the result tile sits below the league block (not beside) and is
// grey, the same background as the Boutique tiles.
test("Bloc 88/B: grey result tile below the league block, matching Boutique", async ({
  page,
}) => {
  await openDemo(page, 1280);
  const leagueBlock = page.locator(".calculator-stack section.calculator-card");
  const tile = page.locator(".demo-attack-tile");
  const lb = await leagueBlock.boundingBox();
  const tb = await tile.boundingBox();
  expect(tb!.y).toBeGreaterThan(lb!.y + lb!.height - 2);

  const tileBg = await tile.evaluate(
    (el) => getComputedStyle(el).backgroundColor,
  );
  await page.goto("/referentiels/shop");
  const shopBg = await page
    .locator(".consumable-tile")
    .first()
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(tileBg).toBe(shopBg);
});

// Bloc 88/C-E: the city-level field lives in the tile next to the walls and
// maximum-troops results (side by side on desktop), edits recalc live, and
// no percentage is shown anywhere on the tool.
test("Bloc 88/C-E: editable city-level in the tile, walls+troops side by side, no percentage", async ({
  page,
}) => {
  await openDemo(page, 1280);
  await page
    .getByRole("group", { name: leagueGroupName })
    .getByRole("button", { name: "Bronze" })
    .click();

  const cityLevel = page.getByRole("spinbutton", {
    name: "Niveau de ville visée",
  });
  const wall = page.getByTestId("demo-wall");
  const troops = page.getByTestId("demo-troops");
  const tile = page.locator(".demo-attack-tile");

  // All three inside the same tile.
  await expect(
    tile.getByRole("spinbutton", { name: "Niveau de ville visée" }),
  ).toHaveCount(1);
  await expect(tile.getByTestId("demo-wall")).toHaveCount(1);
  await expect(tile.getByTestId("demo-troops")).toHaveCount(1);

  // Walls left of troops, on the same line (desktop).
  const wb = await wall.boundingBox();
  const trb = await troops.boundingBox();
  const sameLine =
    Math.max(wb!.y, trb!.y) <
    Math.min(wb!.y + wb!.height, trb!.y + trb!.height);
  expect(sameLine).toBe(true);
  expect(wb!.x).toBeLessThan(trb!.x);

  // Live recalculation on 2 different city levels.
  await cityLevel.fill("1");
  await expect(wall).toHaveText("70");
  await cityLevel.fill("50");
  await expect(wall).not.toHaveText("70");

  // Bloc 88/E: no percentage anywhere on the tool.
  expect(await tile.innerText()).not.toContain("%");
  expect(
    await page.locator(".demo-attack-league-field").innerText(),
  ).not.toContain("%");
});

// Bloc 88/F: mobile stacks the tile — city-level on its own line, then walls
// and maximum troops together on the next line — and keeps the 2x3 league grid.
test("Bloc 88/F: mobile stacks the tile and keeps the 2x3 league grid", async ({
  page,
}) => {
  await openDemo(page, 480);
  const group = page.getByRole("group", { name: leagueGroupName });
  await group.getByRole("button", { name: "Bronze" }).click();

  const cityLevel = page.getByRole("spinbutton", {
    name: "Niveau de ville visée",
  });
  const cb = await cityLevel.boundingBox();
  const wb = await page.getByTestId("demo-wall").boundingBox();
  const trb = await page.getByTestId("demo-troops").boundingBox();

  // City-level on its own line, above the results.
  expect(wb!.y).toBeGreaterThan(cb!.y + cb!.height - 4);
  // Walls + troops on the same line.
  const sameLine =
    Math.max(wb!.y, trb!.y) <
    Math.min(wb!.y + wb!.height, trb!.y + trb!.height);
  expect(sameLine).toBe(true);

  // League buttons in a 2x3 grid: the 4th button sits on a second row.
  const buttons = group.getByRole("button");
  await expect(buttons).toHaveCount(6);
  const first = await buttons.nth(0).boundingBox();
  const fourth = await buttons.nth(3).boundingBox();
  expect(fourth!.y).toBeGreaterThan(first!.y + first!.height - 4);
});
