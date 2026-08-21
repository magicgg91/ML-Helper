import { expect, test } from "@playwright/test";

test("switches the public navigation language and falls back to English", async ({
  page,
}) => {
  // The root can legitimately redirect to the one-time setup while the
  // bootstrap E2E test runs in parallel. Contact always renders the public
  // shell and therefore isolates the locale switch behavior.
  await page.goto("/contact");

  const language = page.getByLabel(/Language|Langue/);
  await language.selectOption("en");
  await expect(page.getByRole("link", { name: "Simulators" })).toBeVisible();

  await language.selectOption("fr");
  await expect(page.getByRole("link", { name: "Simulateurs" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Admin area" })).toBeVisible();
});
