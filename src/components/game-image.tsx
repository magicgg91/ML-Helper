"use client";

import { useState } from "react";
import type { ReactNode } from "react";

// Tente de charger un fichier fourni par le joueur (gemmes/équipements,
// cdc sections 11-12). Tant que le fichier n'existe pas côté serveur,
// bascule sur le repli visuel fourni par l'appelant au lieu d'une icône
// d'image cassée. La bascule inverse (fichier déposé après coup) est
// automatique : chaque nouveau `src` est retenté indépendamment.
export function GameImage({
  src,
  alt,
  className,
  fallback,
  width,
  height,
  eager = false,
}: {
  src: string;
  alt: string;
  className?: string;
  fallback: ReactNode;
  // Bloc 91/M2: the image's intrinsic pixel dimensions, so the browser can
  // reserve the right box (and aspect ratio) before the file loads instead of
  // reflowing when it arrives — belt-and-braces alongside the CSS sizing.
  // Pass them ONLY when the true aspect ratio is known and correct (gems and
  // tile art are square; templars are 1000×1353). Codex review (PR #114):
  // omit them for equipment/consumables assets, whose dimensions vary and are
  // often non-square (e.g. 214×156) — .stuff-slot-image only caps max-height,
  // so a wrong width/height there would letterbox/shrink the real image.
  width?: number;
  height?: number;
  // Bloc 36/B: the first tool category tile is the page's LCP element on
  // both the homepage and /tools — same "villes" special-case the old
  // next/image usage had, ported here so switching to GameImage doesn't
  // regress it.
  eager?: boolean;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (failedSrc === src) return <>{fallback}</>;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- graceful onError fallback for game assets not yet uploaded.
    <img
      src={src}
      alt={alt}
      className={className}
      width={width}
      height={height}
      loading={eager ? "eager" : "lazy"}
      onError={() => setFailedSrc(src)}
    />
  );
}
