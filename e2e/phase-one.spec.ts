import { expect, test } from "@playwright/test";

test("a super admin signs in, creates an admin, and sees the audit log", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Username").fill("rootadmin");
  await page.getByLabel("Password").fill("correct-horse-battery-staple");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin$/);

  await page.getByRole("link", { name: "Users" }).click();
  const createForm = page.locator("form").first();
  await createForm.locator('input[name="username"]').fill("phase1admin");
  await createForm.locator('input[name="password"]').fill("phase-one-password");
  await createForm.locator('select[name="role"]').selectOption("admin");
  await page.getByRole("button", { name: "Create user" }).click();
  await expect(page.getByRole("status")).toHaveText("User created");
  await expect(page.getByRole("cell", { name: "phase1admin" })).toBeVisible();

  await page.getByRole("link", { name: "Logs" }).click();
  await expect(page.getByRole("cell", { name: "create" })).toBeVisible();
  await expect(page.getByText(/user:/)).toBeVisible();
});
