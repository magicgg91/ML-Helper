"use client";

import { useEffect, useState } from "react";

type Theme = "dark" | "light";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = localStorage.getItem("mlhelper_theme");
      const initial: Theme = saved === "light" ? "light" : "dark";
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
      aria-label={`Activer le mode ${theme === "dark" ? "clair" : "sombre"}`}
      aria-pressed={theme === "light"}
    >
      <span aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>
    </button>
  );
}
