import { expect, test, type Page } from "@playwright/test";

// Bloc 90: admin language visibility. These tests mutate global locale
// settings, so they run one at a time (default within-file ordering) and each
// re-enables any locale it disabled.

const ROOT = {
  username: "rootadmin",
  password: "correct-horse-battery-staple",
};

async function ensureRoot(page: Page) {
  const setup = await page.request.post("/api/admin/setup", { data: ROOT });
  expect([201, 409]).toContain(setup.status());
}

async function login(page: Page, username: string, password: string) {
  await page.goto("/login");
  await page.getByLabel(/Username|Identifiant/).fill(username);
  await page.getByLabel(/Password|Mot de passe/).fill(password);
  await page.getByRole("button", { name: /Sign in|Se connecter/ }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

async function setLocaleActive(page: Page, locale: string, active: boolean) {
  const response = await page.request.patch("/api/admin/config/locales", {
    data: { locale, active },
  });
  expect(response.ok(), `toggle ${locale}=${active}`).toBeTruthy();
}

// Bloc 90/A: the Configuration tab is reachable only by admin/super_admin —
// both in the UI (nav link + page) and via a forged API request.
test("Bloc 90/A: Configuration tab restricted to admin/super_admin", async ({
  browser,
}) => {
  const rootContext = await browser.newContext();
  const root = await rootContext.newPage();
  await ensureRoot(root);
  await login(root, ROOT.username, ROOT.password);

  // super_admin reaches the tab and sees the language table.
  await expect(root.getByRole("link", { name: "Configuration" })).toBeVisible();
  const configResponse = await root.goto("/admin/config");
  expect(configResponse?.status()).toBe(200);
  await expect(root.getByRole("cell", { name: "Deutsch" })).toBeVisible();

  // Create a non-admin account (tools_manager) to prove the tab is denied.
  const created = await root.request.post("/api/admin/users", {
    data: {
      username: "b90-tools",
      role: "tools_manager",
      password: "role-test-password",
    },
  });
  expect([201, 409]).toContain(created.status());
  await rootContext.close();

  const toolsContext = await browser.newContext();
  const tools = await toolsContext.newPage();
  await login(tools, "b90-tools", "role-test-password");
  // No Configuration nav link for a non-admin role.
  await expect(tools.getByRole("link", { name: "Configuration" })).toHaveCount(
    0,
  );
  // Direct URL is forbidden (403).
  const denied = await tools.goto("/admin/config");
  expect(denied?.status()).toBe(403);
  await expect(
    tools.getByRole("heading", { name: "Accès interdit" }),
  ).toBeVisible();
  // Forged API request is rejected too.
  const forged = await tools.request.patch("/api/admin/config/locales", {
    data: { locale: "de", active: false },
  });
  expect(forged.status()).toBe(403);
  await toolsContext.close();
});

// Bloc 90/D: EN and FR can never be deactivated — their toggles are locked in
// the UI, and a forged API request to disable them is rejected.
test("Bloc 90/D: English and French cannot be deactivated", async ({
  browser,
}) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await ensureRoot(page);
  await login(page, ROOT.username, ROOT.password);
  await page.goto("/admin/config");

  // Locked (not toggleable) in the UI: a disabled lock button, no toggle.
  for (const locale of ["en", "fr"]) {
    await expect(page.getByTestId(`locale-locked-${locale}`)).toBeDisabled();
    await expect(page.getByTestId(`locale-toggle-${locale}`)).toHaveCount(0);
  }
  // DE/ES/TR are genuinely toggleable.
  for (const locale of ["de", "es", "tr"])
    await expect(page.getByTestId(`locale-toggle-${locale}`)).toBeEnabled();

  // Forged API deactivation of EN/FR is rejected (422) and never persisted.
  for (const locale of ["en", "fr"]) {
    const forged = await page.request.patch("/api/admin/config/locales", {
      data: { locale, active: false },
    });
    expect(forged.status(), `deactivate ${locale}`).toBe(422);
  }
  await context.close();
});

// Bloc 90/B+C+E: deactivating a language persists in the DB, removes it from
// the public selector, and redirects a visitor whose cookie points at it to
// English — while its JSON files stay put (its content still renders once
// re-enabled).
test("Bloc 90/B+C+E: deactivating DE hides it publicly and redirects to EN", async ({
  browser,
}) => {
  const adminContext = await browser.newContext();
  const admin = await adminContext.newPage();
  await ensureRoot(admin);
  await login(admin, ROOT.username, ROOT.password);

  await setLocaleActive(admin, "de", false);

  // Bloc 90/B: persisted — a reload of the tab shows DE inactive.
  await admin.goto("/admin/config");
  const deRow = admin.getByRole("row").filter({ hasText: "Deutsch" });
  await expect(deRow).toContainText(/Inactive|Disabled/);

  // Bloc 90/C: the public selector no longer offers DE, but still offers the
  // other active locales.
  const publicContext = await browser.newContext();
  const visitor = await publicContext.newPage();
  await visitor.goto("/");
  await visitor.locator(".locale-select-trigger").click();
  const options = visitor.getByRole("option");
  const codes = await options.allInnerTexts();
  expect(codes).not.toContain("DE");
  expect(codes).toEqual(expect.arrayContaining(["EN", "FR", "ES", "TR"]));
  await publicContext.close();

  // Bloc 90/E: a visitor whose NEXT_LOCALE cookie is the now-disabled DE is
  // rendered in English (html lang="en").
  const staleContext = await browser.newContext();
  await staleContext.addCookies([
    { name: "NEXT_LOCALE", value: "de", url: "http://127.0.0.1:3000" },
  ]);
  const stale = await staleContext.newPage();
  await stale.goto("/");
  await expect(stale.locator("html")).toHaveAttribute("lang", "en");
  await staleContext.close();

  // Cleanup: re-enable DE and confirm its content renders again (files intact).
  await setLocaleActive(admin, "de", true);
  const reContext = await browser.newContext();
  await reContext.addCookies([
    { name: "NEXT_LOCALE", value: "de", url: "http://127.0.0.1:3000" },
  ]);
  const rehydrated = await reContext.newPage();
  await rehydrated.goto("/");
  await expect(rehydrated.locator("html")).toHaveAttribute("lang", "de");
  await reContext.close();
  await adminContext.close();
});

// Bloc 90/F: the public deactivation never blocks admin content editing in
// that language — the editorial locale picker still offers it and its fields
// stay editable.
test("Bloc 90/F: admin can still edit content in a deactivated language", async ({
  browser,
}) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await ensureRoot(page);
  await login(page, ROOT.username, ROOT.password);

  await setLocaleActive(page, "es", false);

  await page.goto("/admin/guides/new");
  // The editorial language picker still offers ES (unaffected by the public
  // deactivation).
  const picker = page.getByLabel("Langue du guide");
  await expect(picker.locator("option", { hasText: "ES" })).toHaveCount(1);
  await picker.selectOption("es");
  // The ES title field is present and editable.
  const title = page.getByLabel("Titre (ES)");
  await title.fill("Título en español");
  await expect(title).toHaveValue("Título en español");

  await setLocaleActive(page, "es", true);
  await context.close();
});
