import { expect, test } from "@playwright/test";

// Bloc 87/A: every skill-contribution percentage is displayed rounded to at
// most 1 decimal (standard rounding — see formatSkillPercentValue). The
// Combat reference's per-piece skill values (.reference-value) are all such
// percentages, so none of them may show 2+ decimals.
test("Bloc 87/A: reference skill percentages show at most 1 decimal", async ({
  page,
}) => {
  await page.goto("/referentiels/combat-equipment");
  const values = page.locator(".reference-value");
  await expect(values.first()).toBeVisible();
  const texts = await values.allInnerTexts();
  expect(texts.length).toBeGreaterThan(0);
  // French locale: "23,8%" — at most one digit after the comma, or "—".
  const atMostOneDecimal = /^\d[\d ]*(,\d)?%$|^—$/;
  for (const raw of texts) {
    const text = raw.trim();
    expect(text, `"${text}" should have at most 1 decimal`).toMatch(
      atMostOneDecimal,
    );
  }
});

async function contentWidthRatio(
  page: import("@playwright/test").Page,
  selector: string,
) {
  return page.locator(selector).first().evaluate((el) => {
    const parent = el.parentElement!;
    const style = getComputedStyle(parent);
    const content =
      parent.clientWidth -
      parseFloat(style.paddingLeft) -
      parseFloat(style.paddingRight);
    return el.getBoundingClientRect().width / content;
  });
}

// Bloc 87/B: the Progression (and Événement) league picker occupies 50% of
// its container's width on desktop, and stays full-width on mobile.
test("Bloc 87/B: Progression league buttons are 50% wide on desktop, full on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/referentiels/level-up");
  const group = page.locator(".league-buttons-half");
  await expect(group).toBeVisible();

  const desktopRatio = await contentWidthRatio(page, ".league-buttons-half");
  expect(desktopRatio).toBeGreaterThan(0.45);
  expect(desktopRatio).toBeLessThan(0.55);

  await page.setViewportSize({ width: 480, height: 900 });
  const mobileRatio = await contentWidthRatio(page, ".league-buttons-half");
  expect(mobileRatio).toBeGreaterThan(0.9);
});

// Bloc 87/C: on the Combat/Expedition equipment references, the family and
// rarity filter groups sit side by side, each 50% of the row (equal width,
// same line) on desktop, and stack on mobile.
for (const slug of ["combat-equipment", "expedition-equipment"]) {
  test(`Bloc 87/C: ${slug} filter groups are 50/50 side by side on desktop`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`/referentiels/${slug}`);
    const groups = page.locator(".reference-filters > div");
    await expect(groups).toHaveCount(2);

    const g0 = await groups.nth(0).boundingBox();
    const g1 = await groups.nth(1).boundingBox();
    expect(g0).not.toBeNull();
    expect(g1).not.toBeNull();

    // Equal width = 50/50 split.
    expect(Math.abs(g0!.width - g1!.width)).toBeLessThan(4);
    // Same line (vertical ranges overlap) and side by side (left/right).
    const overlapsVertically =
      Math.max(g0!.y, g1!.y) <
      Math.min(g0!.y + g0!.height, g1!.y + g1!.height);
    expect(overlapsVertically).toBe(true);
    expect(g0!.x + g0!.width).toBeLessThanOrEqual(g1!.x + 2);

    // Mobile: stacked (the second group sits below the first).
    await page.setViewportSize({ width: 480, height: 900 });
    const m0 = await groups.nth(0).boundingBox();
    const m1 = await groups.nth(1).boundingBox();
    expect(m1!.y).toBeGreaterThan(m0!.y + m0!.height - 2);
  });
}
