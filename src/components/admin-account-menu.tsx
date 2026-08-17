"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";

export function AdminAccountMenu({ username }: { username: string }) {
  const [message, setMessage] = useState("");
  async function changePassword(formData: FormData) {
    const response = await fetch("/api/admin/profile/password", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        currentPassword: formData.get("currentPassword"),
        newPassword: formData.get("newPassword"),
      }),
    });
    setMessage(
      response.ok
        ? "Mot de passe mis à jour."
        : "Mot de passe actuel incorrect ou nouveau mot de passe invalide.",
    );
  }
  return (
    <div className="admin-account">
      <details>
        <summary>{username}</summary>
        <div className="admin-account-menu">
          <form action={changePassword}>
            <strong>Changer mon mot de passe</strong>
            <label>
              Mot de passe actuel
              <input name="currentPassword" type="password" required />
            </label>
            <label>
              Nouveau mot de passe
              <input
                name="newPassword"
                type="password"
                minLength={12}
                required
              />
            </label>
            <button type="submit">Enregistrer</button>
            {message && <p role="status">{message}</p>}
          </form>
          <button
            className="secondary-action"
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            Se déconnecter
          </button>
        </div>
      </details>
    </div>
  );
}
