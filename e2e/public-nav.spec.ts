import { expect, test } from "@playwright/test";

test("marks the current page's nav link as active", async ({ page }) => {
  // Bloc 91/M7: aria-current lives on the header nav; the footer repeats the
  // same links without it, so scope every assertion to the header nav.
  const nav = page.getByRole("navigation", { name: "Navigation principale" });
  await page.goto("/guides");
  await expect(nav.getByRole("link", { name: "Guides" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(nav.getByRole("link", { name: "Outils" })).not.toHaveAttribute(
    "aria-current",
  );

  await page.goto("/tools/villes");
  await expect(nav.getByRole("link", { name: "Outils" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(nav.getByRole("link", { name: "Guides" })).not.toHaveAttribute(
    "aria-current",
  );
});
