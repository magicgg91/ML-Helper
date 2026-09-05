import { expect, test } from "@playwright/test";

test("published guides render Markdown and GFM content", async ({ page }) => {
  await page.goto("/guides/guide-visible");

  const table = page.getByRole("table");
  await expect(
    table.getByRole("columnheader", { name: "Colonne" }),
  ).toBeVisible();
  await expect(table.getByRole("cell", { name: "42" })).toBeVisible();
  await expect(
    page.locator("ul").filter({ hasText: "Élément à puces" }),
  ).toBeVisible();
  // Bloc 91/M7: the breadcrumb is also an <ol>, so scope to the guide body.
  await expect(page.locator(".guide-shell ol")).toContainText("Première étape");

  const tasks = page.getByRole("checkbox");
  await expect(tasks).toHaveCount(2);
  await expect(tasks.nth(0)).not.toBeChecked();
  await expect(tasks.nth(1)).toBeChecked();
  await expect(page.locator("del")).toHaveText("Ancien texte");
  await expect(page.locator("pre code.language-ts")).toContainText(
    "const answer = 42;",
  );
  await expect(page.locator("blockquote")).toContainText("Citation de test");
  await expect(
    page.getByRole("link", { name: "Lien de test" }),
  ).toHaveAttribute("href", "https://example.com");
});
