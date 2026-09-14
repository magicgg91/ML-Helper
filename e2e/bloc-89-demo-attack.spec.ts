import { expect, test, type Page } from "@playwright/test";

const demoTab = "Troupes en attaque démo";
const leagueGroupName = "Ligue de l’attaquant";

// Open the Demo Attack Troops tool and select a league so the two result
// mini-tiles (wall + maximum troops) are rendered.
async function openDemoWithResult(page: Page, width: number) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto("/tools/combat");
  await page.getByRole("tab", { name: demoTab }).click();
  await page
    .getByRole("group", { name: leagueGroupName })
    .getByRole("button", { name: "Bronze" })
    .click();
  await expect(page.getByTestId("demo-wall")).toBeVisible();
}

// Relative luminance of any CSS color string, normalized through a 1×1 canvas
// so the computed-value format (rgb(), color(srgb …), a resolved color-mix)
// doesn't matter — only "is this one lighter than that one".
async function luminance(page: Page, color: string) {
  return page.evaluate((c) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, 1, 1);
    ctx.fillStyle = c;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }, color);
}

// Bloc 89/A: the result tile, full-width in Bloc 88, now takes only 50% of the
// available width on desktop.
test("Bloc 89/A: the result tile is 50% of the width on desktop", async ({
  page,
}) => {
  await openDemoWithResult(page, 1280);
  const ratio = await page.locator(".demo-attack-tile").evaluate((el) => {
    const parent = el.parentElement!; // .calculator-stack
    const s = getComputedStyle(parent);
    const content =
      parent.clientWidth -
      parseFloat(s.paddingLeft) -
      parseFloat(s.paddingRight);
    return el.getBoundingClientRect().width / content;
  });
  expect(ratio).toBeGreaterThan(0.45);
  expect(ratio).toBeLessThan(0.55);
});

// Bloc 89/B: the wall and maximum-troops values each sit in their own nested
// mini-tile, a grey slightly lighter than the main tile — on desktop AND
// mobile.
for (const width of [1280, 480]) {
  test(`Bloc 89/B: nested mini-tiles lighter than the main tile (${width}px)`, async ({
    page,
  }) => {
    await openDemoWithResult(page, width);
    const wallTile = page.locator(".demo-attack-inner-tile").nth(0);
    const troopsTile = page.locator(".demo-attack-inner-tile").nth(1);
    await expect(wallTile).toBeVisible();
    await expect(troopsTile).toBeVisible();
    // Two distinct inner tiles, one holding the wall value, the other troops.
    await expect(wallTile.getByTestId("demo-wall")).toHaveCount(1);
    await expect(troopsTile.getByTestId("demo-troops")).toHaveCount(1);

    const mainBg = await page
      .locator(".demo-attack-tile")
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    const wallBg = await wallTile.evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );
    const troopsBg = await troopsTile.evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );
    const mainLum = await luminance(page, mainBg);
    expect(await luminance(page, wallBg)).toBeGreaterThan(mainLum);
    expect(await luminance(page, troopsBg)).toBeGreaterThan(mainLum);
  });
}

// Bloc 89/C: the value inside each mini-tile is horizontally centered — tested
// on both mini-tiles, on desktop AND mobile.
for (const width of [1280, 480]) {
  test(`Bloc 89/C: values centered inside the mini-tiles (${width}px)`, async ({
    page,
  }) => {
    await openDemoWithResult(page, width);
    for (const testid of ["demo-wall", "demo-troops"]) {
      const value = page.getByTestId(testid);
      const tile = page
        .locator(".demo-attack-inner-tile")
        .filter({ has: page.getByTestId(testid) });
      const vb = (await value.boundingBox())!;
      const tb = (await tile.boundingBox())!;
      const valueCenter = vb.x + vb.width / 2;
      const tileCenter = tb.x + tb.width / 2;
      expect(Math.abs(valueCenter - tileCenter)).toBeLessThan(2);
    }
  });
}

// Bloc 89/D: the three parts of the tile — the city-level field and the two
// mini-tiles — sit side by side, each taking an equal third, on desktop.
test("Bloc 89/D: the three parts are equal thirds on desktop", async ({
  page,
}) => {
  await openDemoWithResult(page, 1280);
  const level = (await page.locator(".demo-attack-tile-level").boundingBox())!;
  const wallTile = (await page
    .locator(".demo-attack-inner-tile")
    .nth(0)
    .boundingBox())!;
  const troopsTile = (await page
    .locator(".demo-attack-inner-tile")
    .nth(1)
    .boundingBox())!;

  // Left to right: city-level field, wall tile, troops tile — on the same row.
  expect(level.x).toBeLessThan(wallTile.x);
  expect(wallTile.x).toBeLessThan(troopsTile.x);
  const sameRow =
    Math.max(level.y, wallTile.y, troopsTile.y) <
    Math.min(
      level.y + level.height,
      wallTile.y + wallTile.height,
      troopsTile.y + troopsTile.height,
    );
  expect(sameRow).toBe(true);

  // Equal thirds: every part within 6% of the average width.
  const widths = [level.width, wallTile.width, troopsTile.width];
  const avg = (widths[0] + widths[1] + widths[2]) / 3;
  for (const w of widths) expect(Math.abs(w - avg) / avg).toBeLessThan(0.06);
});
