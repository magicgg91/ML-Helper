"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SetupSuperAdminForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");

  async function submit(formData: FormData) {
    setMessage("Création du compte…");
    try {
      const response = await fetch("/api/admin/setup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(Object.fromEntries(formData)),
      });
      if (response.ok) {
        router.push("/login");
        router.refresh();
        return;
      }
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setMessage(
        payload?.error === "setup_already_completed"
          ? "La configuration initiale a déjà été effectuée."
          : "Impossible de créer le compte. Vérifie le nom et utilise un mot de passe d’au moins 12 caractères.",
      );
    } catch {
      setMessage("Impossible de joindre le serveur. Réessaie plus tard.");
    }
  }

  return (
    <form className="setup-form" action={submit}>
      <label>
        Nom d’utilisateur
        <input
          name="username"
          minLength={3}
          maxLength={40}
          pattern="[a-zA-Z0-9_-]+"
          autoComplete="username"
          required
        />
      </label>
      <label>
        Mot de passe
        <input
          name="password"
          type="password"
          minLength={12}
          maxLength={128}
          autoComplete="new-password"
          required
        />
      </label>
      <button className="primary-button" type="submit">
        Créer le Super Admin
      </button>
      {message && (
        <p className="form-status" role="status">
          {message}
        </p>
      )}
    </form>
  );
}
