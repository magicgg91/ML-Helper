import { rarityClassName } from "../lib/equipment-rarity";

export function RarityBadge({
  rarity,
  label,
}: {
  rarity: string;
  label: string;
}) {
  return (
    <span className={`rarity-badge rarity-${rarityClassName(rarity)}`}>
      {label}
    </span>
  );
}
