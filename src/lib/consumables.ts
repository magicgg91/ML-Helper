import {
  parseLocalizedFieldPair,
  type LocalizedField,
} from "./localized-field";

// Bloc 43: Consumables is the 6th reference actually built, and the first
// with free CRUD (add/remove/reorder) instead of a fixed catalog — cdc/brief
// give no locked formula for these items, just a starting list to load.
// Row shape mirrors CombatReferenceRow/ExpeditionReferenceRow (snake_case
// keys, no id field — array position is the row's identity and its public
// display order, cdc "l'ordre choisi en admin est l'ordre d'affichage
// public"). Bloc 127: the name and the description are no longer flat
// strings but one field per language, see ConsumableRow below.
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

/**
 * Bloc 127 (PR 1/3) : le nom et la description passent de la paire
 * `name_fr`/`name_en` à un champ par langue (`LocalizedField`), comme le nom
 * libre d'un échelon (Bloc 135) et la description d'un outil (Bloc 130).
 *
 * La paire datait du Bloc 43, quand le site publiait deux langues ; il en
 * publie cinq, et un visiteur allemand lisait donc l'anglais — ce qu'AGENTS.md
 * interdit pour tout texte vu par un utilisateur. La migration
 * `20260927000000_consumables_localized_fields` réécrit la donnée ; `image` et
 * `cost` ne sont pas du texte éditorial et ne bougent pas.
 */
export type ConsumableRow = {
  image: string;
  name: LocalizedField;
  description: LocalizedField;
  // Empty string = cost still unconfirmed (never invented, AGENTS.md) —
  // shown as such publicly, left blank (not defaulted to 0) in admin.
  cost: string;
};

// Une ligne neuve n'a aucune langue écrite : un champ vide est **absent**,
// jamais `""` (Bloc 126/D) — sans quoi `localizedText` le tiendrait pour écrit
// et s'arrêterait dessus au lieu de se replier.
export const emptyConsumableRow: ConsumableRow = {
  image: "",
  name: {},
  description: {},
  cost: "",
};

/**
 * Bloc 127 : une ligne stockée, quelle que soit la forme en base.
 *
 * La migration réécrit la paire en champs par langue ; ce repli de lecture est
 * le filet pour ce que le SQL ne peut pas atteindre — une sauvegarde restaurée
 * d'avant elle, une installation dont l'image n'a pas encore tourné. Sans lui,
 * le nom et la description d'un objet disparaîtraient de la page sans un mot.
 */
export function parseConsumableRow(
  value: Record<string, unknown>,
): ConsumableRow {
  return {
    image: typeof value.image === "string" ? value.image : "",
    name: parseLocalizedFieldPair(value.name, {
      fr: value.name_fr,
      en: value.name_en,
    }),
    description: parseLocalizedFieldPair(value.description, {
      fr: value.description_fr,
      en: value.description_en,
    }),
    cost: typeof value.cost === "string" ? value.cost : "",
  };
}

// Bloc 58/A: the free-text markdown intro zone is gone, replaced by a
// structured "intro" table — same row shape and CRUD as the 4 category
// tables, reusing the exact same admin/public table components. It's kept
// as its own top-level key rather than a 5th entry in consumableCategories
// so it can never end up in the category filter buttons or the
// filter-driven per-category loops: it always renders first and is never
// affected by category filters.
export type ConsumableCatalog = Record<ConsumableCategory, ConsumableRow[]> & {
  intro: ConsumableRow[];
};

export const emptyConsumableCatalog: ConsumableCatalog = {
  intro: [],
  advisors: [],
  equipment: [],
  expedition: [],
  inventory: [],
};

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
  // Bloc 58/A: starts empty on purpose — the previous free-text intro
  // (Saphirs, Inventaire) is not auto-migrated into this new table; an
  // admin re-enters it by hand once the table exists.
  intro: [],
  advisors: [
    {
      image: "/consumables/advisor-commander.webp",
      name: { fr: "Commandant", en: "Commander" },
      description: {
        fr: "Regroupement multiple gratuit, Espionnage de masse gratuit, Portée de regroupement multiple améliorée, Calcul de la puissance d'attaque",
        en: "Free multi-rally, free mass scouting, improved multi-rally range, attack power calculation",
      },
      cost: "800",
    },
    {
      image: "/consumables/advisor-harvester.webp",
      name: { fr: "Récolteur", en: "Harvester" },
      description: {
        fr: "Le Récolteur collecte automatiquement les bonus que vous avez découverts sur la carte.",
        en: "The Harvester automatically collects the bonuses you've discovered on the map.",
      },
      cost: "1000",
    },
    {
      image: "/consumables/advisor-watcher.webp",
      name: { fr: "Veilleur", en: "Watcher" },
      description: {
        fr: "Le Veilleur protège vos villes des attaques ennemies. Vous pouvez personnaliser la période de protection.",
        en: "The Watcher protects your cities from enemy attacks. You can customize the protection period.",
      },
      cost: "1500",
    },
    {
      image: "/consumables/advisor-weapon-master.webp",
      name: { fr: "Maitre d'Armes", en: "Weapon Master" },
      description: {
        fr: "Utilise automatiquement vos meilleurs équipements suivant la situation.",
        en: "Automatically equips your best gear depending on the situation.",
      },
      cost: "1000",
    },
  ],
  equipment: [
    {
      image: "/consumables/common-equipment-chest.webp",
      name: { fr: "Coffre", en: "Chest" },
      description: {
        fr: "Ce coffre peut contenir des Armes, des Boucliers et/ou des Ceintures.",
        en: "This chest may contain Weapons, Shields and/or Belts.",
      },
      cost: "150",
    },
    {
      image: "/consumables/common-equipment-chest.webp",
      name: { fr: "Coffre ×5", en: "Chest ×5" },
      description: {
        fr: "Ce coffre peut contenir des Armes, des Boucliers et/ou des Ceintures.",
        en: "This chest may contain Weapons, Shields and/or Belts.",
      },
      cost: "675",
    },
    {
      image: "/consumables/common-jewelry-chest.webp",
      name: { fr: "Coffret à bijoux", en: "Jewelry Box" },
      description: {
        fr: "Ce coffret à bijoux peut contenir des Pendentifs, des Anneaux et/ou des Bracelets.",
        en: "This jewelry box may contain Pendants, Rings and/or Bracelets.",
      },
      cost: "150",
    },
    {
      image: "/consumables/common-jewelry-chest.webp",
      name: { fr: "Coffret à bijoux ×5", en: "Jewelry Box ×5" },
      description: {
        fr: "Ce coffret à bijoux peut contenir des Pendentifs, des Anneaux et/ou des Bracelets.",
        en: "This jewelry box may contain Pendants, Rings and/or Bracelets.",
      },
      cost: "675",
    },
    {
      image: "/consumables/common-loot-chest.webp",
      name: { fr: "Caisse", en: "Crate" },
      description: {
        fr: "Cette caisse peut contenir des Bottes, des Gantelets et/ou des Casques.",
        en: "This crate may contain Boots, Gauntlets and/or Helmets.",
      },
      cost: "150",
    },
    {
      image: "/consumables/common-loot-chest.webp",
      name: { fr: "Caisse ×5", en: "Crate ×5" },
      description: {
        fr: "Cette caisse peut contenir des Bottes, des Gantelets et/ou des Casques.",
        en: "This crate may contain Boots, Gauntlets and/or Helmets.",
      },
      cost: "675",
    },
    {
      image: "/consumables/mighty-equipment-chest.webp",
      name: { fr: "Coffre divin", en: "Divine Chest" },
      description: {
        fr: "Ce coffre peut contenir des Armes, des Boucliers et/ou des Ceintures.",
        en: "This chest may contain Weapons, Shields and/or Belts.",
      },
      cost: "1200",
    },
    {
      image: "/consumables/mighty-equipment-chest.webp",
      name: { fr: "Coffre divin ×10", en: "Divine Chest ×10" },
      description: {
        fr: "Ce coffre peut contenir des Armes, des Boucliers et/ou des Ceintures.",
        en: "This chest may contain Weapons, Shields and/or Belts.",
      },
      cost: "10500",
    },
    {
      image: "/consumables/mighty-jewelry-chest.webp",
      name: { fr: "Coffret divin à bijoux", en: "Divine Jewelry Box" },
      description: {
        fr: "Ce coffret à bijoux peut contenir des Pendentifs, des Anneaux et/ou des Bracelets.",
        en: "This jewelry box may contain Pendants, Rings and/or Bracelets.",
      },
      cost: "1200",
    },
    {
      image: "/consumables/mighty-jewelry-chest.webp",
      name: { fr: "Coffret divin à bijoux ×10", en: "Divine Jewelry Box ×10" },
      description: {
        fr: "Ce coffret à bijoux peut contenir des Pendentifs, des Anneaux et/ou des Bracelets.",
        en: "This jewelry box may contain Pendants, Rings and/or Bracelets.",
      },
      cost: "10500",
    },
    {
      image: "/consumables/mighty-loot-chest.webp",
      name: { fr: "Caisse divine", en: "Divine Crate" },
      description: {
        fr: "Cette caisse peut contenir des Bottes, des Gantelets et/ou des Casques.",
        en: "This crate may contain Boots, Gauntlets and/or Helmets.",
      },
      cost: "1200",
    },
    {
      image: "/consumables/mighty-loot-chest.webp",
      name: { fr: "Caisse divine ×10", en: "Divine Crate ×10" },
      description: {
        fr: "Cette caisse peut contenir des Bottes, des Gantelets et/ou des Casques.",
        en: "This crate may contain Boots, Gauntlets and/or Helmets.",
      },
      cost: "10500",
    },
    {
      image: "/consumables/urn.webp",
      name: { fr: "Urne", en: "Urn" },
      description: {
        fr: "Cette urne peut contenir une Cape, une Pochette d'herboriste et/ou une Longue-vue.",
        en: "This urn may contain a Cloak, an Herbalist Pouch and/or a Spyglass.",
      },
      cost: "150",
    },
    {
      image: "/consumables/urn.webp",
      name: { fr: "Urne ×5", en: "Urn ×5" },
      description: {
        fr: "Cette urne peut contenir une Cape, une Pochette d'herboriste et/ou une Longue-vue.",
        en: "This urn may contain a Cloak, an Herbalist Pouch and/or a Spyglass.",
      },
      cost: "675",
    },
    {
      image: "/consumables/mighty-urn.webp",
      name: { fr: "Urne divine", en: "Divine Urn" },
      description: {
        fr: "Cette urne peut contenir une Cape, une Pochette d'herboriste et/ou une Longue-vue.",
        en: "This urn may contain a Cloak, an Herbalist Pouch and/or a Spyglass.",
      },
      cost: "1200",
    },
    {
      image: "/consumables/mighty-urn.webp",
      name: { fr: "Urne divine ×10", en: "Divine Urn ×10" },
      description: {
        fr: "Cette urne peut contenir une Cape, une Pochette d'herboriste et/ou une Longue-vue.",
        en: "This urn may contain a Cloak, an Herbalist Pouch and/or a Spyglass.",
      },
      cost: "10500",
    },
    {
      image: "/consumables/jar.webp",
      name: { fr: "Jarre", en: "Jar" },
      description: {
        fr: "Cette jarre peut contenir une Boussole, une Pioche et/ou une Torche.",
        en: "This jar may contain a Compass, a Pickaxe and/or a Torch.",
      },
      cost: "150",
    },
    {
      image: "/consumables/jar.webp",
      name: { fr: "Jarre ×5", en: "Jar ×5" },
      description: {
        fr: "Cette jarre peut contenir une Boussole, une Pioche et/ou une Torche.",
        en: "This jar may contain a Compass, a Pickaxe and/or a Torch.",
      },
      cost: "675",
    },
    {
      image: "/consumables/mighty-jar.webp",
      name: { fr: "Jarre divine", en: "Divine Jar" },
      description: {
        fr: "Cette jarre peut contenir une Boussole, une Pioche et/ou une Torche.",
        en: "This jar may contain a Compass, a Pickaxe and/or a Torch.",
      },
      cost: "1200",
    },
    {
      image: "/consumables/mighty-jar.webp",
      name: { fr: "Jarre divine ×10", en: "Divine Jar ×10" },
      description: {
        fr: "Cette jarre peut contenir une Boussole, une Pioche et/ou une Torche.",
        en: "This jar may contain a Compass, a Pickaxe and/or a Torch.",
      },
      cost: "10500",
    },
  ],
  expedition: [
    {
      image: "/consumables/expedition-bag.webp",
      name: { fr: "Sac d'expédition", en: "Expedition Bag" },
      description: {
        fr: "Un sac contenant des provisions pour votre aventurier. Vous pouvez l'utiliser pour lancer des expéditions.",
        en: "A bag containing supplies for your adventurer. Use it to launch expeditions.",
      },
      cost: "450",
    },
    {
      image: "/consumables/expedition-parchment.webp",
      name: { fr: "Parchemin d'Expédition", en: "Expedition Parchment" },
      description: {
        fr: "Cet objet vous permet de modifier les destinations des expéditions de votre aventurier et découvrir de nouveaux horizons vers lesquels il pourra repartir.",
        en: "This item lets you change your adventurer's expedition destinations and discover new horizons to explore.",
      },
      cost: "100",
    },
    {
      image: "/consumables/phoenix-elixir.webp",
      name: { fr: "Elixir du Phénix", en: "Phoenix Elixir" },
      description: {
        fr: "Lorsque ton aventurier est trop blessé pour poursuivre l'expédition, utilise cet élixir pour restaurer instantanément toute sa santé et continuer l'aventure.",
        en: "When your adventurer is too wounded to continue the expedition, use this elixir to instantly restore all their health and carry on the adventure.",
      },
      cost: "750",
    },
    {
      image: "/consumables/teleportation-amulet.webp",
      name: { fr: "Amulette de Téléportation", en: "Teleportation Amulet" },
      description: {
        fr: "Gagnez du temps en téléportant votre aventurier directement vers la base à l'aide de cet objet.",
        en: "Save time by teleporting your adventurer straight back to base with this item.",
      },
      cost: "50",
    },
    {
      image: "/consumables/25-hp-potion.webp",
      name: { fr: "Potion de 25 PV", en: "25 HP Potion" },
      description: {
        fr: "Une potion qui soigne votre aventurier de 25 PV.",
        en: "A potion that heals your adventurer for 25 HP.",
      },
      cost: "250",
    },
    {
      image: "/consumables/50-hp-potion.webp",
      name: { fr: "Potion de 50 PV", en: "50 HP Potion" },
      description: {
        fr: "Une potion qui soigne votre aventurier de 50 PV.",
        en: "A potion that heals your adventurer for 50 HP.",
      },
      cost: "450",
    },
    {
      image: "/consumables/75-hp-potion.webp",
      name: { fr: "Potion de 75 PV", en: "75 HP Potion" },
      description: {
        fr: "Une potion qui soigne votre aventurier de 75 PV.",
        en: "A potion that heals your adventurer for 75 HP.",
      },
      cost: "650",
    },
  ],
  inventory: [
    {
      image: "/consumables/city-rename.webp",
      name: { fr: "Renommer votre ville", en: "Rename Your City" },
      description: {
        fr: "Chaque ville a besoin d'un nom, pensez à utiliser cet objet pour la renommer.",
        en: "Every city needs a name — use this item to rename it.",
      },
      cost: "",
    },
    {
      image: "/consumables/clan-rename.webp",
      name: { fr: "Renommer votre clan", en: "Rename Your Clan" },
      description: {
        fr: "Si vous êtes le chef d'un clan, vous pouvez modifier son nom à tout moment grâce à cet objet.",
        en: "If you're the leader of a clan, you can change its name at any time with this item.",
      },
      cost: "",
    },
    {
      image: "/consumables/fresh-start.webp",
      name: { fr: "Nouveau départ", en: "Fresh Start" },
      description: {
        fr: "Le nouveau départ est une véritable joie lorsque vous êtes dos au mur ou que vous voulez tout simplement recommencer à zéro. Il vous permet de commencer votre ascension vers le sommet dans une nouvelle zone aléatoire.",
        en: "A fresh start is a real relief when you're backed into a corner, or simply want to start over. It lets you begin your climb to the top in a new random zone.",
      },
      cost: "",
    },
    {
      image: "/consumables/lord-rename.webp",
      name: { fr: "Renommer votre seigneur", en: "Rename Your Lord" },
      description: {
        fr: "Vous pouvez changer votre nom à tout moment.",
        en: "You can change your name at any time.",
      },
      cost: "1500",
    },
    {
      image: "/consumables/main-city-change.webp",
      name: { fr: "Changement de ville principale", en: "Change Main City" },
      description: {
        fr: "Même si votre ville principale est mal située, vous pouvez toujours désigner l'une de vos villes alliées comme ville principale. Le premier changement est gratuit, les suivants sont payants (en saphirs ou via cet objet).",
        en: "Even if your main city is poorly located, you can always designate one of your allied cities as your main city. The first change is free; later changes cost sapphires or this item.",
      },
      cost: "",
    },
    {
      image: "/consumables/reskill-book.webp",
      name: { fr: "Réinitialisation de compétences", en: "Skill Reset" },
      description: {
        fr: "Si vous pensez que vous n'avez pas attribué correctement vos points de compétence, vous pouvez utiliser cet objet pour les réinitialiser. Le coût augmente de 50 saphirs à chaque réinitialisation.",
        en: "If you think you haven't allocated your skill points correctly, use this item to reset them. The cost increases by 50 sapphires with each reset.",
      },
      cost: "50",
    },
    {
      image: "/consumables/speed-up.webp",
      name: { fr: "Accélération de vitesse de troupes", en: "Troop Speed-Up" },
      description: {
        fr: "L'accélération des troupes vous permet d'augmenter la vitesse de déplacement d'une troupe d'une ville à l'autre. Ne fonctionne que sur les déplacements entre vos villes.",
        en: "Troop speed-ups increase how fast a troop moves from one city to another. Only works for movements between your own cities.",
      },
      cost: "25",
    },
  ],
};

const defaultCategoryByName = new Map(
  consumableCategories.flatMap((category) =>
    defaultConsumableCatalog[category].map(
      (row) => [row.name.fr ?? "", category] as const,
    ),
  ),
);
