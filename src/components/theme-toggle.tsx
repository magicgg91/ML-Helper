"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

type Theme = "dark" | "light";

export function ThemeToggle() {
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
      setTheme(initial);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    localStorage.setItem("mlhelper_theme", next);
  }
  return (
    <button
      className="theme-toggle"
      type="button"
      onClick={toggle}
      aria-label={t(theme === "dark" ? "theme-light" : "theme-dark")}
      aria-pressed={theme === "light"}
    >
      <span aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>
    </button>
  );
}
