import { expect, test } from "@playwright/test";

test("submits the contact form and reports that email sending isn't configured", async ({
  page,
}) => {
  await page.goto("/contact");
  // Bloc 91/E2: the brand/keyword title template applies to every page.
  await expect(page).toHaveTitle("Contact | ML-Helper · Million Lords");
  await expect(page.locator("main.contact-page")).toBeVisible();
  // Bloc 129 §3.6 : le titre est « Contact », sans surtitre ni dégradé.
  await expect(page.getByRole("heading", { name: "Contact" })).toBeVisible();

  const email = page.getByLabel("Ton email");
  const message = page.getByLabel("Message");

  await expect(email).toHaveAttribute("required", "");
  await expect(message).toHaveAttribute("required", "");
  // §3.6 : l'objet est un groupe de quatre pastilles, plus un <select>.
  await expect(page.getByRole("combobox")).toHaveCount(0);
  for (const label of [
    "Erreur dans les données",
    "Idée d'amélioration",
    "Question",
    "Autre",
  ])
    await expect(
      page.getByRole("button", { name: label, exact: true }),
    ).toHaveAttribute("aria-pressed", "false");

  await email.fill("player@example.com");
  await page
    .getByRole("button", { name: "Erreur dans les données", exact: true })
    .click();
  await message.fill("Le taux d'XP semble faux en Légende.");
  await page.getByRole("button", { name: "Envoyer" }).click();

  await expect(
    page.getByText(
      "L’envoi d’emails n’est pas configuré pour le moment, réessaie plus tard.",
    ),
  ).toBeVisible();
});

// Bloc 129 §2.4 : « Signaler une erreur » ouvre Contact prêt à écrire —
// l'objet choisi et la page nommée.
test("Bloc129/§2.4: le lien de signalement préremplit l'objet et la page", async ({
  page,
}) => {
  await page.goto("/referentiels");
  await page.goto(
    "/contact?subject=data-error&page=" +
      encodeURIComponent("Villes › Coût de ville"),
  );
  await expect(
    page.getByRole("button", { name: "Erreur dans les données", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Page concernée")).toHaveValue(
    "Villes › Coût de ville",
  );
  // Et le message demande ce qu'on attend pour cet objet-là.
  await expect(page.getByLabel("Message")).toHaveAttribute(
    "placeholder",
    "Quelle valeur est affichée, et laquelle vois-tu en jeu ?",
  );
});
