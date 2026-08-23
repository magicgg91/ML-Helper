import { expect, test } from "@playwright/test";

test("submits the contact form and reports that email sending isn't configured", async ({
  page,
}) => {
  await page.goto("/contact");
  await expect(page.locator("main.contact-page")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Contacter ML-Helper" }),
  ).toBeVisible();

  const email = page.getByLabel("Email");
  const subject = page.getByLabel("Objet");
  const message = page.getByLabel("Message");

  await expect(email).toHaveAttribute("required", "");
  await expect(subject).toHaveAttribute("required", "");
  await expect(message).toHaveAttribute("required", "");
  for (const label of [
    "Signaler une erreur de donnée",
    "Suggestion d’amélioration",
    "Problème technique / bug",
    "Autre",
  ]) {
    await expect(page.getByRole("option", { name: label })).toHaveCount(1);
  }

  await email.fill("player@example.com");
  await subject.selectOption("data-error");
  await message.fill("Le taux d'XP semble faux en Légende.");
  await page.getByRole("button", { name: "Envoyer" }).click();

  await expect(
    page.getByText(
      "L’envoi d’emails n’est pas configuré pour le moment, réessaie plus tard.",
    ),
  ).toBeVisible();
});
