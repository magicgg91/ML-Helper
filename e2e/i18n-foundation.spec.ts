import { expect, test } from "@playwright/test";

test("switches the public navigation language and falls back to English", async ({
  page,
}) => {
  // The root can legitimately redirect to the one-time setup while the
  // bootstrap E2E test runs in parallel. Contact always renders the public
  // shell and therefore isolates the locale switch behavior.
  await page.goto("/contact");

  // Bloc 48/C: the public switcher is now a custom ARIA listbox (button
  // trigger + role="listbox" popup), not a native <select>.
  const trigger = page.getByRole("button", { name: /Language|Langue/ });
  const listbox = page.getByRole("listbox", { name: /Language|Langue/ });
  // Bloc 91/M7: the footer now repeats the section links, so scope to the
  // header nav to keep the locale-switch assertion unambiguous.
  // Bloc 92/L5: the header nav's accessible name is now localized
  // (navigation("main")), so it reads "Navigation principale" in FR and
  // "Main navigation" in EN — match either as the locale is switched below.
  const primaryNav = page.getByRole("navigation", {
    name: /Navigation principale|Main navigation/,
  });
  await trigger.click();
  await listbox.getByRole("option", { name: "EN" }).click();
  await expect(primaryNav.getByRole("link", { name: "Tools" })).toBeVisible();

  await trigger.click();
  await listbox.getByRole("option", { name: "FR" }).click();
  await expect(primaryNav.getByRole("link", { name: "Outils" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Admin area" })).toHaveCount(0);
});
