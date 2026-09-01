import { expect, test } from "@playwright/test";

// Bloc 57: the Boutique reference screen has a single save button (Bloc 42)
// that used to fire 2 separate requests (intro PATCH + rows PUT), each
// writing its own audit log row — one click produced 2 lines in
// /admin/logs instead of 1. Both writes now go through a single combined
// PUT request wrapped in one transaction with one audit log entry.
test("Bloc57/A+B: a single Boutique save produces exactly 1 audit log line, correctly named", async ({
  page,
}) => {
  await page.request.post("/api/admin/setup", {
    data: { username: "bloc57admin", password: "bloc57-secure-password" },
  });
  await page.goto("/login");
  await page.getByLabel(/Identifiant/).fill("bloc57admin");
  await page.getByLabel(/Mot de passe/).fill("bloc57-secure-password");
  await page.getByRole("button", { name: /Se connecter/ }).click();
  await expect(page).toHaveURL(/\/admin$/);

  const before = await page.request.get("/api/admin/logs");
  const beforeCount = (await before.json()).length;

  const saveResponse = await page.request.put(
    "/api/admin/guides/references/consumables",
    {
      data: {
        intro: { fr: "## Introduction Boutique", en: "", de: "", es: "", tr: "" },
        catalog: { advisors: [], equipment: [], expedition: [], inventory: [] },
      },
    },
  );
  expect(saveResponse.ok()).toBeTruthy();

  const after = await page.request.get("/api/admin/logs");
  const logs: Array<{ message: string }> = await after.json();
  expect(logs.length).toBe(beforeCount + 1);

  const newest = logs[0];
  expect(newest.message).toContain("Boutique");
  expect(newest.message).not.toContain("Consommables");

  // No residual "Consommables" naming anywhere in the log history.
  for (const entry of logs) expect(entry.message).not.toContain("Consommables");
});
