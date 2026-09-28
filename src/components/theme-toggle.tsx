"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { applyThemeColor, type Theme } from "@/lib/theme-color";

/**
 * Bloc 125 §2: the admin needs this button 34 px square, borderless, and
 * named in its own words — without changing how it looks or reads on the
 * public header, which is not this bloc's business. Both are props, and both
 * default to exactly what the public site had.
 */
export function ThemeToggle({
  className,
  labels,
}: {
  className?: string;
  labels?: { toDark: string; toLight: string };
} = {}) {
  const t = useTranslations("common");
  const [theme, setTheme] = useState<Theme>("dark");
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = localStorage.getItem("mlhelper_theme");
      // Bloc 33/B: first visit (no explicit choice saved yet) follows the
      // OS/browser preference instead of always defaulting to dark —
      // matches the inline blocking script in the root layout.
      const initial: Theme =
        saved === "light" || saved === "dark"
          ? saved
          : window.matchMedia("(prefers-color-scheme: light)").matches
            ? "light"
            : "dark";
      document.documentElement.dataset.theme = initial;
      // Bloc 103: the status-bar colour follows the theme everywhere the
      // theme is set — here and in toggle() below, mirroring the root
      // layout's pre-paint script.
      applyThemeColor(initial);
      setTheme(initial);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    applyThemeColor(next);
    localStorage.setItem("mlhelper_theme", next);
  }
  const label =
    theme === "dark"
      ? (labels?.toLight ?? t("theme-light"))
      : (labels?.toDark ?? t("theme-dark"));
  return (
    <button
      className={className ?? "theme-toggle"}
      type="button"
      onClick={toggle}
      aria-label={label}
      aria-pressed={theme === "light"}
    >
      {/* Bloc 129 §2.1 : l'icône annonce ce vers quoi on va — soleil quand
          on est en sombre, lune quand on est en clair — et c'est aussi ce
          que dit l'aria-label ci-dessus. Deux vraies icônes plutôt que les
          glyphes ☀/☾, que les polices rendaient de façon très inégale. */}
      {theme === "dark" ? (
        <SunIcon aria-hidden="true" size={18} />
      ) : (
        <MoonIcon aria-hidden="true" size={18} />
      )}
    </button>
  );
}
