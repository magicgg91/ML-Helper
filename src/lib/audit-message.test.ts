import { describe, expect, it } from "vitest";
import { auditMessage } from "./audit-message";

describe("auditMessage", () => {
  it("stores a readable action with actor and target snapshots", () => {
    expect(auditMessage("admin", "deactivate", "le calculateur Coût de Ville")).toBe(
      "admin a désactivé le calculateur Coût de Ville",
    );
  });

  it("keeps deleted targets and publishing actions understandable", () => {
    expect(auditMessage("root", "delete", "l’utilisateur toto")).toBe(
      "root a supprimé l’utilisateur toto",
    );
    expect(auditMessage("admin", "publish", "le guide Guide du débutant")).toBe(
      "admin a publié le guide Guide du débutant",
    );
  });
});
