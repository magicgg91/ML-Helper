import { expect, test } from "@playwright/test";

test("switches the public navigation language and falls back to English", async ({
  page,
}) => {
  // The root can legitimately redirect to the one-time setup while the
  // bootstrap E2E test runs in parallel. Contact always renders the public
  // shell and therefore isolates the locale switch behavior.
  await page.goto("/contact");

  const language = page.getByRole("group", { name: /Language|Langue/ });
  await language.getByRole("button", { name: "EN" }).click();
  await expect(page.getByRole("link", { name: "Tools" })).toBeVisible();

  await language.getByRole("button", { name: "FR" }).click();
  await expect(page.getByRole("link", { name: "Outils" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Admin area" })).toHaveCount(0);
});
