// Bloc 43: Consumables is the 6th reference actually built, and the first
// with free CRUD (add/remove/reorder) instead of a fixed catalog — cdc/brief
// give no locked formula for these items, just a starting list to load.
// Row shape mirrors CombatReferenceRow/ExpeditionReferenceRow (flat string
// record, snake_case keys, no id field — array position is the row's
// identity and its public display order, cdc "l'ordre choisi en admin est
// l'ordre d'affichage public").
// Bloc 48/B: category is no longer a field on the row — it's now implicit
// to which table/array a row lives in (ConsumableCatalog groups rows by
// category instead of one flat array with a category column). Order below
// is alphabetical (Bloc 48/D: Conseillers, Équipement, Expédition,
// Inventaire) — this is also the public table/filter display order.
export const consumableCategories = [
  "advisors",
  "equipment",
  "expedition",
  "inventory",
] as const;
export type ConsumableCategory = (typeof consumableCategories)[number];

// Codex review (PR #69), still needed for Bloc 48's migration of
// pre-Bloc48 stored data (flat array with a category field per row): a row
// saved before Bloc 46 (no category field yet) must recover its real
// category from the shipped catalog by name — an installation that already
// edited/reordered the table before this deploy would otherwise have every
// one of its advisor/expedition/equipment rows silently reclassified as
// "inventory" on next read. Only a genuinely custom row (added by an
// admin, no match by name) falls back to "inventory".
export function parseConsumableCategory(
  value: unknown,
  nameFr?: string,
): ConsumableCategory {
  if ((consumableCategories as readonly string[]).includes(value as string))
    return value as ConsumableCategory;
  const recovered = nameFr && defaultCategoryByName.get(nameFr);
  return recovered || "inventory";
}

export type ConsumableRow = {
  image: string;
  name_fr: string;
  name_en: string;
  description_fr: string;
  description_en: string;
  // Empty string = cost still unconfirmed (never invented, AGENTS.md) —
  // shown as such publicly, left blank (not defaulted to 0) in admin.
  cost: string;
};

export const emptyConsumableRow: ConsumableRow = {
  image: "",
  name_fr: "",
  name_en: "",
  description_fr: "",
  description_en: "",
  cost: "",
};

export type ConsumableCatalog = Record<ConsumableCategory, ConsumableRow[]>;

// Bloc 48/E: the 3 HP potions move from Inventaire to Expédition — they're
// consumed mid-expedition, not general-purpose inventory items.
export const consumablePotionNames = new Set([
  "Potion de 25 PV",
  "Potion de 50 PV",
  "Potion de 75 PV",
]);

// Starting list provided by the porteur de projet (Bloc 43), regrouped by
// category (Bloc 48/B) with the potions relocated (Bloc 48/E). Image paths
// follow the established `public/<category>/<slug>.webp` convention (cdc
// section 12) — the files themselves are delivered separately from the
// code (GameImage's onError fallback, same as every other reference until
// its assets land).
export const defaultConsumableCatalog: ConsumableCatalog = {
  advisors: [
    {
      image: "/consumables/advisor-commander.webp",
      name_fr: "Commandant",
      name_en: "Commander",
      description_fr:
        "Regroupement multiple gratuit, Espionnage de masse gratuit, Portée de regroupement multiple améliorée, Calcul de la puissance d'attaque",
      description_en:
        "Free multi-rally, free mass scouting, improved multi-rally range, attack power calculation",
      cost: "800",
    },
    {
      image: "/consumables/advisor-harvester.webp",
      name_fr: "Récolteur",
      name_en: "Harvester",
      description_fr:
        "Le Récolteur collecte automatiquement les bonus que vous avez découverts sur la carte.",
      description_en:
        "The Harvester automatically collects the bonuses you've discovered on the map.",
      cost: "1000",
    },
    {
      image: "/consumables/advisor-watcher.webp",
      name_fr: "Veilleur",
      name_en: "Watcher",
      description_fr:
        "Le Veilleur protège vos villes des attaques ennemies. Vous pouvez personnaliser la période de protection.",
      description_en:
        "The Watcher protects your cities from enemy attacks. You can customize the protection period.",
      cost: "1500",
    },
    {
      image: "/consumables/advisor-weapon-master.webp",
      name_fr: "Maitre d'Armes",
      name_en: "Weapon Master",
      description_fr:
        "Utilise automatiquement vos meilleurs équipements suivant la situation.",
      description_en:
        "Automatically equips your best gear depending on the situation.",
      cost: "1000",
    },
  ],
  equipment: [
    {
      image: "/consumables/common-equipment-chest.webp",
      name_fr: "Coffre",
      name_en: "Chest",
      description_fr:
        "Ce coffre peut contenir des Armes, des Boucliers et/ou des Ceintures.",
      description_en: "This chest may contain Weapons, Shields and/or Belts.",
      cost: "150",
    },
    {
      image: "/consumables/common-equipment-chest.webp",
      name_fr: "Coffre ×5",
      name_en: "Chest ×5",
      description_fr:
        "Ce coffre peut contenir des Armes, des Boucliers et/ou des Ceintures.",
      description_en: "This chest may contain Weapons, Shields and/or Belts.",
      cost: "675",
    },
    {
      image: "/consumables/common-jewelry-chest.webp",
      name_fr: "Coffret à bijoux",
      name_en: "Jewelry Box",
      description_fr:
        "Ce coffret à bijoux peut contenir des Pendentifs, des Anneaux et/ou des Bracelets.",
      description_en:
        "This jewelry box may contain Pendants, Rings and/or Bracelets.",
      cost: "150",
    },
    {
      image: "/consumables/common-jewelry-chest.webp",
      name_fr: "Coffret à bijoux ×5",
      name_en: "Jewelry Box ×5",
      description_fr:
        "Ce coffret à bijoux peut contenir des Pendentifs, des Anneaux et/ou des Bracelets.",
      description_en:
        "This jewelry box may contain Pendants, Rings and/or Bracelets.",
      cost: "675",
    },
    {
      image: "/consumables/common-loot-chest.webp",
      name_fr: "Caisse",
      name_en: "Crate",
      description_fr:
        "Cette caisse peut contenir des Bottes, des Gantelets et/ou des Casques.",
      description_en: "This crate may contain Boots, Gauntlets and/or Helmets.",
      cost: "150",
    },
    {
      image: "/consumables/common-loot-chest.webp",
      name_fr: "Caisse ×5",
      name_en: "Crate ×5",
      description_fr:
        "Cette caisse peut contenir des Bottes, des Gantelets et/ou des Casques.",
      description_en: "This crate may contain Boots, Gauntlets and/or Helmets.",
      cost: "675",
    },
    {
      image: "/consumables/mighty-equipment-chest.webp",
      name_fr: "Coffre divin",
      name_en: "Divine Chest",
      description_fr:
        "Ce coffre peut contenir des Armes, des Boucliers et/ou des Ceintures.",
      description_en: "This chest may contain Weapons, Shields and/or Belts.",
      cost: "1200",
    },
    {
      image: "/consumables/mighty-equipment-chest.webp",
      name_fr: "Coffre divin ×10",
      name_en: "Divine Chest ×10",
      description_fr:
        "Ce coffre peut contenir des Armes, des Boucliers et/ou des Ceintures.",
      description_en: "This chest may contain Weapons, Shields and/or Belts.",
      cost: "10500",
    },
    {
      image: "/consumables/mighty-jewelry-chest.webp",
      name_fr: "Coffret divin à bijoux",
      name_en: "Divine Jewelry Box",
      description_fr:
        "Ce coffret à bijoux peut contenir des Pendentifs, des Anneaux et/ou des Bracelets.",
      description_en:
        "This jewelry box may contain Pendants, Rings and/or Bracelets.",
      cost: "1200",
    },
    {
      image: "/consumables/mighty-jewelry-chest.webp",
      name_fr: "Coffret divin à bijoux ×10",
      name_en: "Divine Jewelry Box ×10",
      description_fr:
        "Ce coffret à bijoux peut contenir des Pendentifs, des Anneaux et/ou des Bracelets.",
      description_en:
        "This jewelry box may contain Pendants, Rings and/or Bracelets.",
      cost: "10500",
    },
    {
      image: "/consumables/mighty-loot-chest.webp",
      name_fr: "Caisse divine",
      name_en: "Divine Crate",
      description_fr:
        "Cette caisse peut contenir des Bottes, des Gantelets et/ou des Casques.",
      description_en: "This crate may contain Boots, Gauntlets and/or Helmets.",
      cost: "1200",
    },
    {
      image: "/consumables/mighty-loot-chest.webp",
      name_fr: "Caisse divine ×10",
      name_en: "Divine Crate ×10",
      description_fr:
        "Cette caisse peut contenir des Bottes, des Gantelets et/ou des Casques.",
      description_en: "This crate may contain Boots, Gauntlets and/or Helmets.",
      cost: "10500",
    },
    {
      image: "/consumables/urn.webp",
      name_fr: "Urne",
      name_en: "Urn",
      description_fr:
        "Cette urne peut contenir une Cape, une Pochette d'herboriste et/ou une Longue-vue.",
      description_en:
        "This urn may contain a Cloak, an Herbalist Pouch and/or a Spyglass.",
      cost: "150",
    },
    {
      image: "/consumables/urn.webp",
      name_fr: "Urne ×5",
      name_en: "Urn ×5",
      description_fr:
        "Cette urne peut contenir une Cape, une Pochette d'herboriste et/ou une Longue-vue.",
      description_en:
        "This urn may contain a Cloak, an Herbalist Pouch and/or a Spyglass.",
      cost: "675",
    },
    {
      image: "/consumables/mighty-urn.webp",
      name_fr: "Urne divine",
      name_en: "Divine Urn",
      description_fr:
        "Cette urne peut contenir une Cape, une Pochette d'herboriste et/ou une Longue-vue.",
      description_en:
        "This urn may contain a Cloak, an Herbalist Pouch and/or a Spyglass.",
      cost: "1200",
    },
    {
      image: "/consumables/mighty-urn.webp",
      name_fr: "Urne divine ×10",
      name_en: "Divine Urn ×10",
      description_fr:
        "Cette urne peut contenir une Cape, une Pochette d'herboriste et/ou une Longue-vue.",
      description_en:
        "This urn may contain a Cloak, an Herbalist Pouch and/or a Spyglass.",
      cost: "10500",
    },
    {
      image: "/consumables/jar.webp",
      name_fr: "Jarre",
      name_en: "Jar",
      description_fr:
        "Cette jarre peut contenir une Boussole, une Pioche et/ou une Torche.",
      description_en:
        "This jar may contain a Compass, a Pickaxe and/or a Torch.",
      cost: "150",
    },
    {
      image: "/consumables/jar.webp",
      name_fr: "Jarre ×5",
      name_en: "Jar ×5",
      description_fr:
        "Cette jarre peut contenir une Boussole, une Pioche et/ou une Torche.",
      description_en:
        "This jar may contain a Compass, a Pickaxe and/or a Torch.",
      cost: "675",
    },
    {
      image: "/consumables/mighty-jar.webp",
      name_fr: "Jarre divine",
      name_en: "Divine Jar",
      description_fr:
        "Cette jarre peut contenir une Boussole, une Pioche et/ou une Torche.",
      description_en:
        "This jar may contain a Compass, a Pickaxe and/or a Torch.",
      cost: "1200",
    },
    {
      image: "/consumables/mighty-jar.webp",
      name_fr: "Jarre divine ×10",
      name_en: "Divine Jar ×10",
      description_fr:
        "Cette jarre peut contenir une Boussole, une Pioche et/ou une Torche.",
      description_en:
        "This jar may contain a Compass, a Pickaxe and/or a Torch.",
      cost: "10500",
    },
  ],
  expedition: [
    {
      image: "/consumables/expedition-bag.webp",
      name_fr: "Sac d'expédition",
      name_en: "Expedition Bag",
      description_fr:
        "Un sac contenant des provisions pour votre aventurier. Vous pouvez l'utiliser pour lancer des expéditions.",
      description_en:
        "A bag containing supplies for your adventurer. Use it to launch expeditions.",
      cost: "450",
    },
    {
      image: "/consumables/expedition-parchment.webp",
      name_fr: "Parchemin d'Expédition",
      name_en: "Expedition Parchment",
      description_fr:
        "Cet objet vous permet de modifier les destinations des expéditions de votre aventurier et découvrir de nouveaux horizons vers lesquels il pourra repartir.",
      description_en:
        "This item lets you change your adventurer's expedition destinations and discover new horizons to explore.",
      cost: "100",
    },
    {
      image: "/consumables/phoenix-elixir.webp",
      name_fr: "Elixir du Phénix",
      name_en: "Phoenix Elixir",
      description_fr:
        "Lorsque ton aventurier est trop blessé pour poursuivre l'expédition, utilise cet élixir pour restaurer instantanément toute sa santé et continuer l'aventure.",
      description_en:
        "When your adventurer is too wounded to continue the expedition, use this elixir to instantly restore all their health and carry on the adventure.",
      cost: "750",
    },
    {
      image: "/consumables/teleportation-amulet.webp",
      name_fr: "Amulette de Téléportation",
      name_en: "Teleportation Amulet",
      description_fr:
        "Gagnez du temps en téléportant votre aventurier directement vers la base à l'aide de cet objet.",
      description_en:
        "Save time by teleporting your adventurer straight back to base with this item.",
      cost: "50",
    },
    {
      image: "/consumables/25-hp-potion.webp",
      name_fr: "Potion de 25 PV",
      name_en: "25 HP Potion",
      description_fr: "Une potion qui soigne votre aventurier de 25 PV.",
      description_en: "A potion that heals your adventurer for 25 HP.",
      cost: "250",
    },
    {
      image: "/consumables/50-hp-potion.webp",
      name_fr: "Potion de 50 PV",
      name_en: "50 HP Potion",
      description_fr: "Une potion qui soigne votre aventurier de 50 PV.",
      description_en: "A potion that heals your adventurer for 50 HP.",
      cost: "450",
    },
    {
      image: "/consumables/75-hp-potion.webp",
      name_fr: "Potion de 75 PV",
      name_en: "75 HP Potion",
      description_fr: "Une potion qui soigne votre aventurier de 75 PV.",
      description_en: "A potion that heals your adventurer for 75 HP.",
      cost: "650",
    },
  ],
  inventory: [
    {
      image: "/consumables/city-rename.webp",
      name_fr: "Renommer votre ville",
      name_en: "Rename Your City",
      description_fr:
        "Chaque ville a besoin d'un nom, pensez à utiliser cet objet pour la renommer.",
      description_en: "Every city needs a name — use this item to rename it.",
      cost: "",
    },
    {
      image: "/consumables/clan-rename.webp",
      name_fr: "Renommer votre clan",
      name_en: "Rename Your Clan",
      description_fr:
        "Si vous êtes le chef d'un clan, vous pouvez modifier son nom à tout moment grâce à cet objet.",
      description_en:
        "If you're the leader of a clan, you can change its name at any time with this item.",
      cost: "",
    },
    {
      image: "/consumables/fresh-start.webp",
      name_fr: "Nouveau départ",
      name_en: "Fresh Start",
      description_fr:
        "Le nouveau départ est une véritable joie lorsque vous êtes dos au mur ou que vous voulez tout simplement recommencer à zéro. Il vous permet de commencer votre ascension vers le sommet dans une nouvelle zone aléatoire.",
      description_en:
        "A fresh start is a real relief when you're backed into a corner, or simply want to start over. It lets you begin your climb to the top in a new random zone.",
      cost: "",
    },
    {
      image: "/consumables/lord-rename.webp",
      name_fr: "Renommer votre seigneur",
      name_en: "Rename Your Lord",
      description_fr: "Vous pouvez changer votre nom à tout moment.",
      description_en: "You can change your name at any time.",
      cost: "1500",
    },
    {
      image: "/consumables/main-city-change.webp",
      name_fr: "Changement de ville principale",
      name_en: "Change Main City",
      description_fr:
        "Même si votre ville principale est mal située, vous pouvez toujours désigner l'une de vos villes alliées comme ville principale. Le premier changement est gratuit, les suivants sont payants (en saphirs ou via cet objet).",
      description_en:
        "Even if your main city is poorly located, you can always designate one of your allied cities as your main city. The first change is free; later changes cost sapphires or this item.",
      cost: "",
    },
    {
      image: "/consumables/reskill-book.webp",
      name_fr: "Réinitialisation de compétences",
      name_en: "Skill Reset",
      description_fr:
        "Si vous pensez que vous n'avez pas attribué correctement vos points de compétence, vous pouvez utiliser cet objet pour les réinitialiser. Le coût augmente de 50 saphirs à chaque réinitialisation.",
      description_en:
        "If you think you haven't allocated your skill points correctly, use this item to reset them. The cost increases by 50 sapphires with each reset.",
      cost: "50",
    },
    {
      image: "/consumables/speed-up.webp",
      name_fr: "Accélération de vitesse de troupes",
      name_en: "Troop Speed-Up",
      description_fr:
        "L'accélération des troupes vous permet d'augmenter la vitesse de déplacement d'une troupe d'une ville à l'autre. Ne fonctionne que sur les déplacements entre vos villes.",
      description_en:
        "Troop speed-ups increase how fast a troop moves from one city to another. Only works for movements between your own cities.",
      cost: "25",
    },
  ],
};

const defaultCategoryByName = new Map(
  consumableCategories.flatMap((category) =>
    defaultConsumableCatalog[category].map(
      (row) => [row.name_fr, category] as const,
    ),
  ),
);

// Bloc 43: the free-text markdown zone at the top of the public page —
// same {fr,en} shape as legal-notice's StaticContent, left empty by
// default (never inventing lore copy) until the porteur de projet fills it
// in via admin, per the brief ("le joueur remplira le contenu réel après
// livraison").
export const consumablesIntroKey = "consumables_intro";
export const defaultConsumablesIntro = { fr: "", en: "" };
