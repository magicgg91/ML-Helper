"use client";

import { useEffect, useState } from "react";
import type { GuideHeading } from "@/lib/guide-outline";

/**
 * Bloc 129 §3.5 : le sommaire d'un guide, avec la section en cours
 * surlignée.
 *
 * L'observation se fait sur les titres réellement rendus, retrouvés par leur
 * identifiant : le sommaire et le corps partagent la même fabrique d'ancres
 * (guide-outline.ts), donc ils ne peuvent pas diverger.
 *
 * Sans IntersectionObserver — un très vieux navigateur, ou un rendu de test —
 * le sommaire reste un sommaire : tous les liens fonctionnent, seule la
 * surbrillance ne suit pas.
 */
export function GuideToc({
  headings,
  label,
  introLabel,
  introHref = "#guide-top",
}: {
  headings: GuideHeading[];
  label: string;
  /** Le premier lien, vers le haut de l'article. */
  introLabel: string;
  /** L'ancre de ce premier lien — les mentions légales ont la leur. */
  introHref?: string;
}) {
  const [current, setCurrent] = useState<string>();

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const targets = headings
      .map((heading) => document.getElementById(heading.id))
      .filter((element): element is HTMLElement => element !== null);
    if (targets.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        // La section en cours est la plus haute de celles qui sont visibles ;
        // à défaut, on garde la dernière connue plutôt que de tout éteindre
        // entre deux titres.
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setCurrent(visible[0].target.id);
      },
      // La bande de détection est le haut de la fenêtre : un titre devient
      // « en cours » quand il atteint le premier quart de l'écran.
      { rootMargin: "-10% 0px -75% 0px", threshold: 0 },
    );
    for (const target of targets) observer.observe(target);
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;
  return (
    <nav className="guide-toc" aria-label={label}>
      <p className="guide-toc-title">{label}</p>
      <ul>
        <li>
          <a href={introHref} aria-current={current ? undefined : "location"}>
            {introLabel}
          </a>
        </li>
        {headings.map((heading) => (
          <li key={heading.id}>
            <a
              href={`#${heading.id}`}
              aria-current={current === heading.id ? "location" : undefined}
            >
              {heading.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
