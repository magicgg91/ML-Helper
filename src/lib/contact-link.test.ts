import { describe, expect, it } from "vitest";
import {
  contactHref,
  contactPageLabel,
  contactPrefillKeys,
} from "./contact-link";

describe("Bloc 129 §2.4 : ouvrir Contact avec l'objet et la page déjà remplis", () => {
  it("porte l'objet, seul, quand aucune page n'est nommée", () => {
    expect(contactHref("data-error")).toBe("/contact?subject=data-error");
  });

  it("porte la page telle qu'elle se lit à l'écran", () => {
    const href = contactHref("data-error", "Villes › Coût de ville");
    const params = new URL(href, "http://localhost").searchParams;
    expect(params.get(contactPrefillKeys.subject)).toBe("data-error");
    expect(params.get(contactPrefillKeys.page)).toBe("Villes › Coût de ville");
  });

  it("laisse tomber une page vide plutôt que d'écrire un paramètre creux", () => {
    expect(contactHref("improvement-suggestion", "   ")).toBe(
      "/contact?subject=improvement-suggestion",
    );
  });

  it("compose le chemin affiché à partir des segments qui existent", () => {
    expect(contactPageLabel("Villes", "Coût de ville")).toBe(
      "Villes › Coût de ville",
    );
    // Un référentiel n'a pas de catégorie au-dessus de lui : pas de séparateur
    // orphelin en tête.
    expect(contactPageLabel(undefined, "Boutique")).toBe("Boutique");
  });
});
