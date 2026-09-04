"use client";

import { Link } from "@/i18n/navigation";
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
// Bloc 54/B: the label used to sit as a separate <p> above a smaller
// button — now it's inside the button itself, alongside a bigger 5rem
// thumbnail (matching Boutique's own reference-table image size, Bloc
// 46/A), so the whole thing reads as one bigger clickable card.
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
        <span className="cross-reference-text">
          <span className="cross-reference-label">{label}</span>
          <span className="cross-reference-title">{title}</span>
        </span>
        <ChevronRight
          size={22}
          aria-hidden="true"
          className="cross-reference-chevron"
        />
      </Link>
    </div>
  );
}
