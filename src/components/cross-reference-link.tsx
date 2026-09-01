"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { GameImage } from "./game-image";

// Bloc 53/E: replaces the plain-text .reference-cross-link/.reference-link
// with a centered banner + clickable mini-card — same spirit as the
// .calculator-card framing the Boutique reference already uses (Bloc 52/C,
// D). Shared by both directions (tool -> reference and reference -> tool):
// the thumbnail is always the reference "concerned" by the pairing (the
// destination when linking to a reference, the source reference itself
// when linking out to a tool — tools have no per-tool illustration of
// their own, only a shared per-category icon).
export function CrossReferenceLink({
  href,
  title,
  image,
  fallbackImage,
  label,
}: {
  href: string;
  title: string;
  image: string;
  fallbackImage: string;
  label: string;
}) {
  return (
    <div className="cross-reference-banner">
      <p className="cross-reference-label">{label}</p>
      <Link className="cross-reference-card" href={href}>
        <span className="cross-reference-thumb">
          <GameImage
            src={image}
            alt=""
            fallback={
              // eslint-disable-next-line @next/next/no-img-element -- static bundled placeholder icon, no next/image benefit for a tiny SVG.
              <img src={fallbackImage} alt="" />
            }
          />
        </span>
        <span className="cross-reference-title">{title}</span>
        <ChevronRight size={18} aria-hidden="true" />
      </Link>
    </div>
  );
}
