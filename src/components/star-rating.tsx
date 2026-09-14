import { Star } from "lucide-react";
import { useTranslations } from "next-intl";

// Bloc 73/D: 1-4 renders as that many white stars; 5-8 converts fully to
// 1-4 yellow stars (never a white+yellow mix) — practical cap at 8.
export function StarRating({
  level,
  size = 10,
}: {
  level: number;
  size?: number;
}) {
  const common = useTranslations("common");
  const capped = Math.max(1, Math.min(8, level));
  const yellow = capped >= 5;
  const count = yellow ? capped - 4 : capped;
  return (
    <span
      className={yellow ? "star-rating star-rating-yellow" : "star-rating"}
      role="img"
      aria-label={common("star-count", { level: capped })}
    >
      {Array.from({ length: count }, (_, index) => (
        <Star key={index} size={size} aria-hidden="true" />
      ))}
    </span>
  );
}
