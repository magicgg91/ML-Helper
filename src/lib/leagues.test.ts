import { describe, expect, it } from "vitest";
import {
  activeLadder,
  baseLeagueOf,
  defaultLeagueLadder,
  divisionsForLeague,
  findLeagueRung,
  hasRungName,
  isSavableLeagueLadder,
  leagueLockFor,
  leagueRungId,
  orderedLadder,
  parseLeagueLadder,
  rungFreeName,
  rungNameForm,
  rungNameLocales,
  rungNameToStore,
  type LeagueLadder,
  type LeagueRung,
} from "./leagues";

/** The bands of one entry of a parsed ladder, by id. */
const bandsIn = (ladder: LeagueLadder, id: string) =>
  findLeagueRung(ladder, id)!.bands;

// Bloc 108/A: the six leagues the tool shipped with, and everything an admin
// had already configured for them, have to survive the move to a dynamic
// ladder. The stored row is not rewritten by a SQL migration — it is read
// through parseLeagueLadder, which accepts both shapes, exactly as this file
// already did for the pre-Bloc-27 French-sentence rows.
describe("Bloc 108/A: migrating the six fixed leagues to a ladder", () => {
  /** A stored row in the pre-Bloc-108 shape, with real configured data. */
  const stored = {
    bronze: [],
    silver: [
      {
        threshold: 1,
        movement: "promotion",
        league: "gold",
        rewards: [
          { type: "sapphires", quantity: 100 },
          { type: "speedups", quantity: 7 },
          { type: "gems", quantity: 6 },
        ],
      },
    ],
    gold: [],
    platinum: [{ threshold: 50, movement: null, league: null, rewards: [] }],
    diamond: [
      {
        threshold: 100,
        movement: "relegation",
        league: "platinum",
        rewards: [{ type: "gems", quantity: 1 }],
      },
    ],
    legend: [],
  };

  it("keeps all six, in game order, active, with their league keys as ids", () => {
    const ladder = parseLeagueLadder(stored);
    expect(ladder.map((entry) => entry.id)).toEqual([
      "bronze",
      "silver",
      "gold",
      "platinum",
      "diamond",
      "legend",
    ]);
    expect(ladder.map((entry) => entry.position)).toEqual([0, 1, 2, 3, 4, 5]);
    // They are already in production: none of them may arrive switched off.
    expect(ladder.every((entry) => entry.active)).toBe(true);
    expect(ladder.every((entry) => entry.division === "")).toBe(true);
  });

  it("carries every configured band across, rewards included", () => {
    const ladder = parseLeagueLadder(stored);
    expect(bandsIn(ladder, "silver")).toEqual(
      stored.silver.map((row) => ({
        threshold: row.threshold,
        movement: row.movement,
        target: row.league,
        rewards: row.rewards,
      })),
    );
    // Speedups specifically: the reward type Bloc 108/H is about.
    expect(bandsIn(ladder, "silver")[0].rewards).toContainEqual({
      type: "speedups",
      quantity: 7,
    });
    // A threshold confirmed without a movement stays unconfirmed, not dropped.
    expect(bandsIn(ladder, "platinum")).toHaveLength(1);
    expect(bandsIn(ladder, "platinum")[0].movement).toBeNull();
  });

  it("re-points every promotion and relegation at the migrated entry", () => {
    const ladder = parseLeagueLadder(stored);
    // `league: "gold"` becomes `target: "gold"`, which is a real id on the
    // new ladder — the whole reason the six keep their league keys.
    expect(bandsIn(ladder, "silver")[0].target).toBe("gold");
    expect(findLeagueRung(ladder, "gold")).toBeDefined();
    expect(bandsIn(ladder, "diamond")[0].target).toBe("platinum");
  });

  it("clears a target that names no entry, rather than leaving it dangling", () => {
    const ladder = parseLeagueLadder([
      {
        id: "bronze",
        league: "bronze",
        division: "",
        name: {},
        position: 0,
        active: true,
        bands: [
          { threshold: 50, movement: "promotion", target: "deleted-rung" },
        ],
      },
    ]);
    expect(bandsIn(ladder, "bronze")[0].target).toBeNull();
    // The band itself survives: its threshold is still real.
    expect(bandsIn(ladder, "bronze")[0].threshold).toBe(50);
  });

  it("refuses a ladder whose ids collide, because a target would be ambiguous", () => {
    const twice = (id: string): LeagueRung => ({
      id,
      league: "gold",
      division: "1",
      name: {},
      position: 0,
      active: true,
      bands: [],
    });
    expect(isSavableLeagueLadder([twice("gold-1")])).toBe(true);
    expect(isSavableLeagueLadder([twice("gold-1"), twice("gold-1")])).toBe(
      false,
    );
    expect(isSavableLeagueLadder([])).toBe(false);
  });

  it("builds an id from the league and division, or from a free name", () => {
    expect(leagueRungId({ league: "gold", division: "1" })).toBe("gold-1");
    // Codex review (PR #135): the free name is stored per locale, and the id
    // is built from the English one first so editing the French name later
    // cannot move an id that bands already point at.
    expect(
      leagueRungId({
        league: null,
        division: "",
        name: { fr: "Élite Suprême", en: "Supreme Elite" },
      }),
    ).toBe("supreme-elite");
    expect(
      leagueRungId({
        league: null,
        division: "",
        name: { fr: "Élite Suprême" },
      }),
    ).toBe("elite-supreme");
    // Bloc 135 : et une langue au-delà de la paire FR/EN nomme l'échelon
    // aussi bien — sans quoi un échelon saisi en allemand seul repartirait
    // avec l'identifiant anonyme « entry ».
    expect(
      leagueRungId({
        league: null,
        division: "",
        name: { de: "Höchste Liga" },
      }),
    ).toBe("hochste-liga");
  });
});

/** The ladder once the studio's divisions exist, bottom rung first. */
function ladderWithDivisions(
  overrides: Partial<Record<string, Partial<LeagueRung>>> = {},
): LeagueLadder {
  const rungs: Array<[string, string]> = [
    ["bronze", ""],
    ["silver", "2"],
    ["silver", "1"],
    ["gold", "2"],
    ["gold", "1"],
    ["platinum", "2"],
    ["platinum", "1"],
    ["diamond", "2"],
    ["diamond", "1"],
    ["legend", ""],
  ];
  return rungs.map(([league, division], index) => {
    const id = division ? `${league}-${division}` : league;
    return {
      id,
      league: league as LeagueRung["league"],
      division,
      name: {},
      position: index,
      active: true,
      bands: [],
      ...overrides[id],
    };
  });
}

// Bloc 108/D: the League Lock is new — the game has always had it, the tool
// never showed it. No admin field: it is two rungs down the ladder.
describe("Bloc 108/D: the League Lock is computed, never typed in", () => {
  it("reproduces the studio's own example: Or 1 locks at Argent 1", () => {
    // Or 1 -> Or 2 -> Argent 1, two rungs down.
    expect(leagueLockFor(ladderWithDivisions(), "gold-1")?.id).toBe("silver-1");
  });

  it.each([
    ["gold-2", "silver-2"],
    ["platinum-1", "gold-1"],
    ["diamond-2", "platinum-2"],
    ["legend", "diamond-2"],
  ])("locks %s at %s", (from, expected) => {
    expect(leagueLockFor(ladderWithDivisions(), from)?.id).toBe(expected);
  });

  // Bloc 111: the three cases near the floor, which Bloc 108 left
  // unspecified and answered with a plain "none". Bronze is the floor: never
  // a lock for anyone, and never locked itself.
  it.each([
    // Already the floor — nothing below it to be held at.
    ["bronze", null],
    // One rung back would be the floor, so the walk shortens to zero rungs.
    ["silver-2", "silver-2"],
    // Two rungs back would be the floor, so it shortens to one.
    ["silver-1", "silver-2"],
  ])("clamps the lock of %s to %s near the floor", (from, expected) => {
    expect(leagueLockFor(ladderWithDivisions(), from)?.id ?? null).toBe(
      expected,
    );
  });

  // The rule stated as the property, not as the three cases: whatever the
  // ladder, the floor is never handed back as anyone's lock.
  it("never returns the ladder's floor as a lock target", () => {
    const ladders = [
      defaultLeagueLadder,
      ladderWithDivisions(),
      // A floor split into divisions, and a ladder switched down to two
      // rungs — the shortest one where a lock can exist at all.
      ladderWithDivisions({ "gold-1": { active: false } }),
      ladderWithDivisions({
        "gold-1": { active: false },
        "gold-2": { active: false },
        "silver-1": { active: false },
      }),
    ];
    for (const ladder of ladders) {
      const active = activeLadder(ladder);
      const floor = active[0]!.id;
      for (const entry of active)
        expect(
          leagueLockFor(ladder, entry.id)?.id,
          `${entry.id} on a ${active.length}-rung ladder`,
        ).not.toBe(floor);
    }
  });

  // And the walk is only ever shortened, never lengthened: no rung is locked
  // at something above itself.
  it("never locks a rung above itself", () => {
    const active = activeLadder(ladderWithDivisions());
    for (const [index, entry] of active.entries()) {
      const lock = leagueLockFor(ladderWithDivisions(), entry.id);
      if (!lock) continue;
      expect(
        active.findIndex((item) => item.id === lock.id),
        `${entry.id} locks at ${lock.id}`,
      ).toBeLessThanOrEqual(index);
    }
  });

  // Bloc 108/B: the lock is a consequence of the order, so reordering must
  // move it. This is the assertion that would fail if insertion order were
  // used as the source of truth instead of the explicit position.
  it("follows a reordering of the ladder", () => {
    const swapped = ladderWithDivisions({
      "gold-2": { position: 4 },
      "gold-1": { position: 3 },
    });
    // Or 1 is now BELOW Or 2, so it sits two rungs above Argent 2.
    expect(leagueLockFor(swapped, "gold-1")?.id).toBe("silver-2");
    expect(leagueLockFor(swapped, "gold-2")?.id).toBe("silver-1");
  });

  // Bloc 108/G: an entry an admin has prepared but not switched on does not
  // exist for the player, so it must not shift the count either.
  it("counts only active rungs", () => {
    const pending = ladderWithDivisions({ "gold-2": { active: false } });
    // With Or 2 switched off the ladder reads Argent 2, Argent 1, Or 1.
    expect(leagueLockFor(pending, "gold-1")?.id).toBe("silver-2");
    expect(activeLadder(pending).map((entry) => entry.id)).not.toContain(
      "gold-2",
    );
  });

  it("has no answer for an entry that is not on the ladder at all", () => {
    expect(leagueLockFor(ladderWithDivisions(), "nowhere")).toBeNull();
  });
});

// Bloc 108/E: the player settings' division field is driven by what an admin
// has really configured — never by a hard-coded list of divisions.
describe("Bloc 108/E: the divisions offered for a league", () => {
  it("is empty for a league with no division configured", () => {
    expect(divisionsForLeague(defaultLeagueLadder, "gold")).toEqual([]);
    expect(divisionsForLeague(ladderWithDivisions(), "bronze")).toEqual([]);
    expect(divisionsForLeague(ladderWithDivisions(), "legend")).toEqual([]);
  });

  it("lists that league's divisions, in ladder order, once they exist", () => {
    expect(
      divisionsForLeague(ladderWithDivisions(), "gold").map((e) => e.id),
    ).toEqual(["gold-2", "gold-1"]);
  });

  it("leaves out a division that is not active yet", () => {
    const pending = ladderWithDivisions({ "gold-1": { active: false } });
    expect(divisionsForLeague(pending, "gold").map((e) => e.id)).toEqual([
      "gold-2",
    ]);
  });

  it("has nothing to offer when no league is chosen", () => {
    expect(divisionsForLeague(ladderWithDivisions(), "")).toEqual([]);
  });
});

// Bloc 108/B: order is explicit, and orderedLadder renumbers positions so an
// admin never has to keep them contiguous by hand.
describe("Bloc 108/B: explicit order", () => {
  it("sorts on position, not on the order the entries happen to be in", () => {
    const shuffled = [...ladderWithDivisions()].reverse();
    expect(orderedLadder(shuffled).map((entry) => entry.id)).toEqual(
      ladderWithDivisions().map((entry) => entry.id),
    );
  });

  it("renumbers gaps away, so positions stay 0..n-1", () => {
    const sparse = ladderWithDivisions({
      bronze: { position: 5 },
      "silver-2": { position: 90 },
    });
    expect(orderedLadder(sparse).map((entry) => entry.position)).toEqual([
      ...Array(10).keys(),
    ]);
  });
});

/**
 * Bloc 135 §2 : le nom libre passe d'une paire FR/EN à un objet par langue.
 *
 * La migration SQL réécrit ce qui est stocké (voir leagues-migration.test.ts) ;
 * ce qui est vérifié ici, c'est le modèle : ce qu'une administration saisit
 * devient, ce qu'un lecteur obtient dans sa langue, et le filet de lecture qui
 * rattrape une ligne restée dans l'ancienne forme.
 */
describe("Bloc 135 §2 : le nom libre sur N langues", () => {
  it("rend le nom dans la langue demandée, avec le repli du site", () => {
    const rung: LeagueRung = {
      id: "champions",
      league: null,
      division: "",
      name: { fr: "Champions", en: "Champions League", de: "Meisterliga" },
      position: 0,
      active: true,
      bands: [],
    };
    expect(rungFreeName(rung, "de")).toBe("Meisterliga");
    expect(rungFreeName(rung, "fr")).toBe("Champions");
    // Une langue non écrite lit l'anglais, jamais un vide (AGENTS.md).
    expect(rungFreeName(rung, "tr")).toBe("Champions League");
  });

  it("n'écrit pas une langue laissée blanche, et enlève les espaces", () => {
    const stored = rungNameToStore({ fr: "  Élite  ", en: "", de: "   " });
    expect(stored).toEqual({ fr: "Élite" });
    // Le formulaire, lui, veut les cinq langues, blanches comprises.
    expect(rungNameForm(stored)).toEqual({
      fr: "Élite",
      en: "",
      de: "",
      es: "",
      tr: "",
    });
    expect(rungNameLocales(stored)).toEqual(["fr"]);
    expect(hasRungName(stored)).toBe(true);
    expect(hasRungName({})).toBe(false);
  });

  /**
   * Le filet de lecture. La migration a réécrit la base, mais une sauvegarde
   * restaurée d'avant elle — ou une image qui n'a pas encore tourné — porte
   * encore la paire, et un nom de division ne doit pas disparaître de l'écran
   * sans un mot.
   */
  it("lit encore une ligne restée en paire FR/EN", () => {
    const ladder = parseLeagueLadder([
      {
        id: "diamond-1",
        league: "diamond",
        division: "1",
        nameFr: "Diamant Élite",
        nameEn: "",
        position: 0,
        active: true,
        bands: [],
      },
    ]);
    expect(ladder[0].name).toEqual({ fr: "Diamant Élite" });
    expect(rungFreeName(ladder[0], "es")).toBe("Diamant Élite");
  });

  it("garde l'objet par langue quand les deux formes sont là", () => {
    const ladder = parseLeagueLadder([
      {
        id: "champions",
        league: null,
        division: "",
        name: { fr: "Champions", de: "Meisterliga" },
        nameFr: "Ancien nom",
        nameEn: "Old name",
        position: 0,
        active: true,
        bands: [],
      },
    ]);
    expect(ladder[0].name).toEqual({ fr: "Champions", de: "Meisterliga" });
  });

  it("accepte un échelon nommé dans une seule langue, même hors FR/EN", () => {
    const rung: LeagueRung = {
      id: "meisterliga",
      league: null,
      division: "",
      name: { de: "Meisterliga" },
      position: 0,
      active: true,
      bands: [],
    };
    expect(isSavableLeagueLadder([rung])).toBe(true);
    // Sans ligue de base NI nom, il n'y a rien pour le nommer.
    expect(isSavableLeagueLadder([{ ...rung, name: {} }])).toBe(false);
    // Et l'analyseur le laisse tomber plutôt que de rendre un échelon anonyme.
    expect(parseLeagueLadder([{ ...rung, name: {} }])).toEqual(
      defaultLeagueLadder,
    );
  });
});

/**
 * Bloc 135 §4 : le trajet d'une division vers sa ligue de base.
 *
 * C'est ce que lisent tous les outils qui ne connaissent pas les divisions —
 * Gemmes, Progression, Événements, Villes, Équipement — et la règle n'était
 * écrite nulle part : elle tenait à ce que le sélecteur de division ne propose
 * au joueur que des divisions de sa propre ligue. Nommée, elle devient
 * vérifiable.
 */
describe("Bloc 135 §4 : baseLeagueOf", () => {
  it("rend la ligue de base d'une division", () => {
    const ladder = ladderWithDivisions();
    expect(baseLeagueOf(ladder, "gold-1")).toBe("gold");
    expect(baseLeagueOf(ladder, "bronze")).toBe("bronze");
  });

  it("rend null pour un échelon libre et pour un identifiant inconnu", () => {
    const ladder: LeagueLadder = [
      ...ladderWithDivisions(),
      {
        id: "champions",
        league: null,
        division: "",
        name: { fr: "Champions" },
        position: 10,
        active: true,
        bands: [],
      },
    ];
    // Un échelon sans ligue de base : rendre une ligue serait l'inventer, et
    // l'appelant indexerait un Record<League, …> avec une clé absente.
    expect(baseLeagueOf(ladder, "champions")).toBeNull();
    // Une division que l'administration a supprimée depuis, dont
    // l'identifiant dort encore dans le localStorage d'un joueur.
    expect(baseLeagueOf(ladder, "gold-3")).toBeNull();
  });

  /**
   * L'invariant dont dépendent Gemmes, Progression, Événements et Villes :
   * pour toute division que le sélecteur des Paramètres joueur peut proposer,
   * la ligue de base rendue par le helper est exactement celle que ces outils
   * lisent déjà dans `player.league`. C'est la preuve que leur sortie est
   * inchangée — un seul chemin, et il donne la même réponse que les leurs.
   */
  it("s'accorde avec la ligue que les autres outils lisent", () => {
    const ladder = ladderWithDivisions();
    for (const league of [
      "bronze",
      "silver",
      "gold",
      "platinum",
      "diamond",
      "legend",
    ] as const)
      for (const division of divisionsForLeague(ladder, league))
        expect(baseLeagueOf(ladder, division.id)).toBe(league);
  });

  it("ignore les échelons inactifs comme le reste du module", () => {
    // Un échelon préparé mais pas allumé garde sa ligue de base — le helper
    // répond sur l'échelle entière, parce qu'une administration a besoin de la
    // réponse avant de publier. Ce qui filtre l'inactif, c'est `activeLadder`,
    // chez l'appelant public.
    const ladder = ladderWithDivisions({ "gold-1": { active: false } });
    expect(baseLeagueOf(ladder, "gold-1")).toBe("gold");
    expect(activeLadder(ladder).map((rung) => rung.id)).not.toContain("gold-1");
    expect(divisionsForLeague(ladder, "gold").map((rung) => rung.id)).toEqual([
      "gold-2",
    ]);
  });
});
