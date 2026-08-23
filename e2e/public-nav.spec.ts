import { expect, test } from "@playwright/test";

test("marks the current page's nav link as active", async ({ page }) => {
  await page.goto("/guides");
  await expect(page.getByRole("link", { name: "Guides" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page.getByRole("link", { name: "Outils" })).not.toHaveAttribute(
    "aria-current",
  );

  await page.goto("/tools/villes");
  await expect(page.getByRole("link", { name: "Outils" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page.getByRole("link", { name: "Guides" })).not.toHaveAttribute(
    "aria-current",
  );
});
