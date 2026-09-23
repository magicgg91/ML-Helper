import { expect, test, type Browser } from "@playwright/test";

// Bloc 118: the admin is an EN/FR product and the public site is a five-language
// one. These tests hold both halves of that at once, without a session: the
// sign-in page is already on the admin side of the clamp src/proxy.ts applies,
// so it answers in English to a reader the public site answers to in German.
//
// The logged-in walk through every admin screen lives at the end of
// phase-one.spec.ts, which is where the Super Admin exists.

const publicHeadings = {
  de: "Entscheide mit den richtigen Zahlen",
  es: "Decide con las cifras correctas",
  tr: "Doğru rakamlarla karar ver",
} as const;

async function contextFor(browser: Browser, locale: string) {
  const context = await browser.newContext({ locale });
  return { context, page: await context.newPage() };
}

test("the sign-in page answers in English to a DE/ES/TR reader", async ({
  browser,
}) => {
  for (const [locale, heading] of Object.entries(publicHeadings)) {
    const { context, page } = await contextFor(
      browser,
      `${locale}-${locale.toUpperCase()}`,
    );

    // The public site first — in their language, and setting NEXT_LOCALE, so
    // what follows exercises the cookie branch of the clamp and not merely a
    // missing Accept-Language.
    await page.goto(`/${locale}/tools`);
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    expect(
      (await context.cookies()).find((item) => item.name === "NEXT_LOCALE")
        ?.value,
      `the public visit did not record ${locale}`,
    ).toBe(locale);

    // Cross the border: same browser, same cookie, English chrome.
    await page.goto("/login");
    await expect(
      page.getByRole("heading", { name: "Admin sign in" }),
    ).toBeVisible();
    await expect(page.getByLabel("Username")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Connexion administration" }),
    ).toHaveCount(0);

    await context.close();
  }
});

test("the sign-in page still answers in French to a French reader", async ({
  browser,
}) => {
  // The clamp keeps two languages, not one — a regression to English-only
  // would pass every assertion above.
  const { context, page } = await contextFor(browser, "fr-FR");
  await page.goto("/login");
  await expect(
    page.getByRole("heading", { name: "Connexion administration" }),
  ).toBeVisible();
  await expect(page.getByLabel("Identifiant")).toBeVisible();
  await context.close();
});

test("the public site is untouched in all five languages", async ({
  browser,
}) => {
  // Bloc 118 narrowed the admin. This is the assertion that it narrowed
  // nothing else: every launched locale still serves its own URL and its own
  // text.
  const expected = {
    fr: "Décide avec les bons chiffres",
    en: "Make decisions with the right numbers",
    ...publicHeadings,
  };
  const { context, page } = await contextFor(browser, "en-US");
  for (const [locale, heading] of Object.entries(expected)) {
    await page.goto(`/${locale}/tools`);
    await expect(
      page.getByRole("heading", { name: heading }),
      `/${locale}/tools lost its own language`,
    ).toBeVisible();
  }
  await context.close();
});
