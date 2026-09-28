import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const globalsCss = readFileSync(path.join(__dirname, "globals.css"), "utf8");
const adminCss = readFileSync(path.join(__dirname, "admin/admin.css"), "utf8");

const darkBlock = globalsCss.slice(
  globalsCss.indexOf(":root,"),
  globalsCss.indexOf(':root[data-theme="light"]'),
);
const lightBlock = globalsCss.slice(
  globalsCss.indexOf(':root[data-theme="light"]'),
  globalsCss.indexOf(':root[data-theme="light"] body'),
);

/**
 * La couleur réellement portée par un jeton, alias compris.
 *
 * Bloc 129 : la moitié des anciens noms (--bg-panel, --text-dim,
 * --surface-muted…) sont devenus des alias des jetons du §1.2. Sans cette
 * résolution, chaque assertion ci-dessous s'arrêterait sur « not found » au
 * lieu de vérifier la couleur — ce qui reviendrait à ne plus rien vérifier.
 */
function extractHex(block: string, name: string, seen: string[] = []): string {
  const match = new RegExp(`--${name}:\\s*([^;]+);`).exec(block);
  if (!match) throw new Error(`--${name} not found in the given CSS block`);
  const value = match[1]!.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(value)) return value;
  const alias = /^var\(--([a-z0-9-]+)\)$/.exec(value);
  if (!alias || seen.includes(name))
    throw new Error(`--${name} resolves to "${value}", not a hex color`);
  return extractHex(block, alias[1]!, [...seen, name]);
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return {
    h: Math.round(h * 60),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

// Plage de teintes des neutres. Elle couvrait l'ardoise bleutée d'origine
// (~214-220°) ; le Bloc 129 §1.2 retiente la rampe sombre vers le violet de
// l'accent (~246-251°) et garde la rampe claire bleutée (~223-228°). Le
// garde-fou reste le même : ni brun (~20-40°), ni le violet franc de
// l'accent lui-même (~260-280°), jamais un fond neutre pur.
const blueSlateHueRange = { min: 190, max: 255 };

/** Le rapport de contraste WCAG entre deux couleurs hex. */
function contrastRatio(foreground: string, background: string): number {
  const luminance = (hex: string) => {
    const value = Number.parseInt(hex.slice(1), 16);
    const channels = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map(
      (channel) => {
        const normalized = channel / 255;
        return normalized <= 0.04045
          ? normalized / 12.92
          : ((normalized + 0.055) / 1.055) ** 2.4;
      },
    );
    return (
      channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722
    );
  };
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort(
    (a, b) => b - a,
  );
  return (lighter! + 0.05) / (darker! + 0.05);
}

describe("color palette — violet accent, gold reserved for legendary", () => {
  it("points --accent and --accent-strong at violet, not gold, in both themes", () => {
    for (const block of [darkBlock, lightBlock]) {
      expect(block).toMatch(/--accent:\s*var\(--violet\);/);
      expect(block).toMatch(/--accent-strong:\s*var\(--violet-bright\);/);
    }
  });

  it("shares the same accent tokens between the admin shell and the public site", () => {
    expect(adminCss).toMatch(/--color-primary:\s*var\(--accent-strong\);/);
    expect(adminCss).toMatch(/--color-ring:\s*var\(--accent\);/);
  });

  it("never uses --gold or --gold-bright as a generic interface color", () => {
    // The site's own rarity system (.rarity-legendaire) uses its own
    // dedicated --rarity-legendaire token and hardcoded badge colors, not
    // --gold — so no selector should reference var(--gold) or
    // var(--gold-bright) at all. Catches gold creeping back in as a hover/
    // active/link accent instead of staying reserved for legendary data.
    expect(globalsCss).not.toMatch(/var\(--gold(-bright)?\)/);
    expect(adminCss).not.toMatch(/var\(--gold(-bright)?\)/);
  });

  it("still defines --gold and --gold-bright, reserved for legendary data", () => {
    expect(globalsCss).toMatch(/--gold:\s*#[0-9a-fA-F]{6};/);
    expect(globalsCss).toMatch(/--gold-bright:\s*#[0-9a-fA-F]{6};/);
  });

  it("keeps the dark theme a blue-slate anthracite, never pure black or brown", () => {
    for (const name of ["bg", "bg-panel", "bg-panel-raised", "surface-muted"]) {
      const { h, l } = hexToHsl(extractHex(darkBlock, name));
      expect(l).toBeGreaterThan(0);
      expect(h).toBeGreaterThanOrEqual(blueSlateHueRange.min);
      expect(h).toBeLessThanOrEqual(blueSlateHueRange.max);
    }
  });

  it("drops the gold-tinted ambient page gradient in favor of violet", () => {
    // rgb(201 160 74 / ...) was --gold (dark); the ambient wash behind the
    // whole page must not carry a warm/golden tint any more.
    expect(globalsCss).not.toMatch(/rgb\(201 160 74/);
  });

  // Bloc 129 §1.2 : --bg-panel-raised suit --raised, que le brief veut
  // blanc pur en thème clair (c'est l'onglet actif, posé sur une carte
  // elle-même teintée). La page et les cartes, elles, restent teintées —
  // c'est ce que cette règle protégeait, et elle le protège toujours.
  it("keeps the light theme tinted (never pure white), same blue family as dark", () => {
    for (const name of ["bg", "bg-panel", "surface-muted"]) {
      const hex = extractHex(lightBlock, name);
      expect(hex.toLowerCase()).not.toBe("#ffffff");
      const { h, s } = hexToHsl(hex);
      expect(s).toBeGreaterThan(0);
      expect(h).toBeGreaterThanOrEqual(blueSlateHueRange.min);
      expect(h).toBeLessThanOrEqual(blueSlateHueRange.max);
    }
  });

  // Bloc 129 §1.2 remplace ici le verrou du Bloc 34/F, qui figeait les cinq
  // hex de la rampe anthracite bleutée (--bg #1b2029, --bg-panel #222833,
  // --bg-panel-raised #29303d, --border #343c4a, --surface-muted #2f3541) et
  // vérifiait que le Bloc 34 n'avait fait que les éclaircir. Cette palette
  // n'existe plus : le brief la remplace entièrement par les 21 jetons
  // ci-dessous. Le verrou est donc reporté sur la nouvelle table — et il
  // couvre les 21, pas 5, si bien qu'une valeur ne peut plus dériver
  // silencieusement du §1.2 qu'un relecteur a validé.
  it("Bloc 129 §1.2: porte exactement les 21 jetons du brief, dans les deux thèmes", () => {
    const brief = {
      dark: {
        bg: "#14131a",
        surface: "#1d1c26",
        sunk: "#18171f",
        raised: "#2a2740",
        border: "#2f2d3b",
        strong: "#3d3a4c",
        divider: "#2a2835",
        dashed: "#4b4859",
        field: "#17161e",
        kbd: "#26242f",
        footer: "#100f15",
        text: "#edebf4",
        text2: "#d6d3e2",
        text3: "#bab6c8",
        muted: "#9d99ae",
        accent: "#b8a0f5",
        "accent-soft": "#241d3c",
        "accent-border": "#43366b",
        "accent-solid": "#a386ee",
        "on-accent": "#15121f",
        ph: "#262432",
      },
      light: {
        bg: "#e5e7ec",
        surface: "#f2f3f6",
        sunk: "#e9ebf0",
        raised: "#ffffff",
        border: "#d3d6dd",
        strong: "#c9cdd5",
        divider: "#dee0e6",
        dashed: "#b8bdc8",
        field: "#fafafb",
        kbd: "#edeef2",
        footer: "#dcdfe6",
        text: "#17151f",
        text2: "#2e3240",
        text3: "#3a3f4b",
        muted: "#4f5563",
        accent: "#5b2db0",
        "accent-soft": "#ede7f8",
        "accent-border": "#d6c9f0",
        "accent-solid": "#5b2db0",
        "on-accent": "#ffffff",
        ph: "#dcdee4",
      },
    };
    for (const [theme, block] of [
      ["dark", darkBlock],
      ["light", lightBlock],
    ] as const)
      for (const [name, hex] of Object.entries(brief[theme]))
        expect(
          extractHex(block, name).toLowerCase(),
          `--${name} en thème ${theme}`,
        ).toBe(hex);
  });

  // La carte « Commence ici » est la seule exception que le §1.2 s'autorise :
  // ses couleurs sont fixes, donc définies une fois et jamais redéfinies dans
  // le bloc clair — sans quoi elle suivrait le thème, ce que le brief refuse.
  it("Bloc 129 §1.2: la carte « Commence ici » garde ses couleurs dans les deux thèmes", () => {
    for (const name of [
      "start-here-bg",
      "start-here-art",
      "start-here-badge",
      "start-here-badge-ink",
      "start-here-title",
      "start-here-text",
    ]) {
      expect(darkBlock).toMatch(new RegExp(`--${name}:\\s*#[0-9a-fA-F]{6};`));
      expect(lightBlock).not.toMatch(new RegExp(`--${name}:`));
    }
    // Et le couple encre/fond du badge doré reste lisible (AA).
    expect(
      contrastRatio(
        extractHex(darkBlock, "start-here-badge-ink"),
        extractHex(darkBlock, "start-here-badge"),
      ),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrastRatio(
        extractHex(darkBlock, "start-here-text"),
        extractHex(darkBlock, "start-here-bg"),
      ),
    ).toBeGreaterThanOrEqual(4.5);
  });

  // Bloc 81/B: the event picker's 10 swatches (Bloc 80/F) read as "too dark"
  // in practice because they reused the shared --violet/--emerald/etc.
  // tokens, tuned for their own jobs elsewhere (accent, success, badges) —
  // not for standing alone as vivid, distinct color-tag options. A
  // dedicated --event-* namespace (theme-invariant, defined once) replaces
  // them; this locks in genuine vividness (high saturation, mid-to-high
  // lightness — never the murky/desaturated end of the scale) for all 10.
  it("Bloc 81/B: the --event-* palette (event-color picker) is genuinely vivid — high saturation, never dark or muted", () => {
    const names = ["violet", "emerald", "amber", "ember", "sapphire"].flatMap(
      (base) => [`event-${base}`, `event-${base}-bright`],
    );
    expect(names).toHaveLength(10);
    for (const name of names) {
      // Emerald's own hue reads darker/less saturated than the other 4 at
      // equal HSL numbers (a property of green, not a palette flaw) — the
      // bounds are set loose enough to hold for all 10 while still ruling
      // out anything genuinely dark (l < 30) or washed-out (s < 55).
      const { s, l } = hexToHsl(extractHex(darkBlock, name));
      expect(s, name).toBeGreaterThanOrEqual(55);
      expect(l, name).toBeGreaterThanOrEqual(30);
      expect(l, name).toBeLessThanOrEqual(80);
    }
  });

  // The swatch/segment tokens are defined once (theme-invariant, no
  // light-theme override) — this is what actually fixes the tester's
  // complaint, since the old shared tokens' light-theme "-bright" variants
  // are deliberately DARKER (for text contrast), the opposite of vivid for
  // a standalone swatch. --event-text-* (Bloc 81/D review) is the one
  // deliberate exception — see the contrast test below.
  it("Bloc 81/B: the --event-* swatch/segment tokens are theme-invariant — no light-theme override to go dark", () => {
    expect(lightBlock).not.toMatch(/--event-(?!text-)/);
  });

  // Bloc 81/D review (Codex PR #98): the timeline name and tile title
  // write --event-text-* directly as text color, over the light theme's
  // own light surfaces (--bg-panel, --surface-muted) — regression-tests
  // the exact bug Codex flagged (e.g. the old --event-amber-bright,
  // #fbbf24, measured ~1.5:1 against --bg-panel there).
  it("Bloc 81/D review: --event-text-* clears WCAG AA (4.5:1) against every light-theme surface it's read against", () => {
    const luminance = (hex: string) => {
      const value = Number.parseInt(hex.slice(1), 16);
      const channels = [
        (value >> 16) & 255,
        (value >> 8) & 255,
        value & 255,
      ].map((channel) => {
        const normalized = channel / 255;
        return normalized <= 0.04045
          ? normalized / 12.92
          : ((normalized + 0.055) / 1.055) ** 2.4;
      });
      return (
        channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722
      );
    };
    const contrast = (foreground: string, background: string) => {
      const [lighter, darker] = [
        luminance(foreground),
        luminance(background),
      ].sort((a, b) => b - a);
      return (lighter! + 0.05) / (darker! + 0.05);
    };
    for (const hue of ["violet", "emerald", "amber", "ember", "sapphire"]) {
      const text = extractHex(lightBlock, `event-text-${hue}`);
      for (const surface of ["bg", "bg-panel", "surface-muted"]) {
        expect(
          contrast(text, extractHex(lightBlock, surface)),
          `event-text-${hue} vs --${surface}`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("Bloc 34/F: keeps WCAG AA text contrast after the dark-theme brightness bump", () => {
    const luminance = (hex: string) => {
      const value = Number.parseInt(hex.slice(1), 16);
      const channels = [
        (value >> 16) & 255,
        (value >> 8) & 255,
        value & 255,
      ].map((channel) => {
        const normalized = channel / 255;
        return normalized <= 0.04045
          ? normalized / 12.92
          : ((normalized + 0.055) / 1.055) ** 2.4;
      });
      return (
        channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722
      );
    };
    const contrast = (foreground: string, background: string) => {
      const [lighter, darker] = [
        luminance(foreground),
        luminance(background),
      ].sort((a, b) => b - a);
      return (lighter! + 0.05) / (darker! + 0.05);
    };
    const text = extractHex(darkBlock, "text");
    for (const background of ["bg", "bg-panel", "bg-panel-raised"]) {
      expect(
        contrast(text, extractHex(darkBlock, background)),
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  // Bloc 92/A11y: .total-box .value.emerald (the calculators' highlighted
  // result values) writes --emerald-text directly as running text, over the
  // page background and the result panels. --emerald itself measured only
  // 4.37:1 (dark) / 4.49:1 (light) as text on --bg — just under AA — so a
  // dedicated text token (same split as --event-text-*) must clear 4.5:1 on
  // every surface a .total-box lands on, in both themes.
  it("Bloc 92/A11y: --emerald-text clears WCAG AA (4.5:1) on --bg and result panels in both themes", () => {
    const luminance = (hex: string) => {
      const value = Number.parseInt(hex.slice(1), 16);
      const channels = [
        (value >> 16) & 255,
        (value >> 8) & 255,
        value & 255,
      ].map((channel) => {
        const normalized = channel / 255;
        return normalized <= 0.04045
          ? normalized / 12.92
          : ((normalized + 0.055) / 1.055) ** 2.4;
      });
      return (
        channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722
      );
    };
    const contrast = (foreground: string, background: string) => {
      const [lighter, darker] = [
        luminance(foreground),
        luminance(background),
      ].sort((a, b) => b - a);
      return (lighter! + 0.05) / (darker! + 0.05);
    };
    for (const block of [darkBlock, lightBlock]) {
      const text = extractHex(block, "emerald-text");
      for (const surface of ["bg", "bg-panel", "bg-panel-raised"]) {
        expect(
          contrast(text, extractHex(block, surface)),
          `emerald-text vs --${surface}`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  // Bloc 92/A11y (H2/L2): secondary text sits on the tinted tile/pill/badge
  // surfaces, whose luminance tracks --surface-muted (the darkest neutral
  // surface). --text-dim (dark) read 4.0–4.49:1 on those tiles and --text-faint
  // (light) read 4.21:1 on the page --bg — just under AA. Lock both at ≥4.5:1
  // so the gems/templars/Boutique secondary text and .total-box small stay
  // legible after the Bloc 92 token bumps.
  it("Bloc 92/A11y: --text-dim clears AA on --surface-muted (dark) and --text-faint clears AA on --bg (light)", () => {
    const luminance = (hex: string) => {
      const value = Number.parseInt(hex.slice(1), 16);
      const channels = [
        (value >> 16) & 255,
        (value >> 8) & 255,
        value & 255,
      ].map((channel) => {
        const normalized = channel / 255;
        return normalized <= 0.04045
          ? normalized / 12.92
          : ((normalized + 0.055) / 1.055) ** 2.4;
      });
      return (
        channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722
      );
    };
    const contrast = (foreground: string, background: string) => {
      const [lighter, darker] = [
        luminance(foreground),
        luminance(background),
      ].sort((a, b) => b - a);
      return (lighter! + 0.05) / (darker! + 0.05);
    };
    expect(
      contrast(
        extractHex(darkBlock, "text-dim"),
        extractHex(darkBlock, "surface-muted"),
      ),
      "text-dim vs --surface-muted (dark)",
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrast(
        extractHex(lightBlock, "text-faint"),
        extractHex(lightBlock, "bg"),
      ),
      "text-faint vs --bg (light)",
    ).toBeGreaterThanOrEqual(4.5);
  });
});

// ---------------------------------------------------------------------------
// Bloc 119 — la palette de l'administration, dans les deux thèmes.
// ---------------------------------------------------------------------------
describe("Bloc 119: admin tokens", () => {
  const adminLight = adminCss.slice(
    adminCss.indexOf(".admin-shell {"),
    adminCss.indexOf(':root[data-theme="dark"] .admin-shell'),
  );
  const adminDark = adminCss.slice(
    adminCss.indexOf(':root[data-theme="dark"] .admin-shell'),
  );

  /** Resolves `--admin-*`, following one `var(--x)` hop into globals.css. */
  const token = (block: string, name: string, themeBlock: string): string => {
    const match = new RegExp(`--admin-${name}:\\s*([^;]+);`).exec(block);
    if (!match) throw new Error(`--admin-${name} introuvable`);
    const value = match[1].trim();
    if (value.startsWith("#")) return value;
    const indirection = /^var\(--([a-z-]+)\)$/.exec(value);
    if (!indirection) throw new Error(`--admin-${name} = ${value}, non résolu`);
    return extractHex(themeBlock, indirection[1]);
  };

  const luminance = (hex: string) => {
    const value = Number.parseInt(hex.slice(1), 16);
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
      .map((channel) => channel / 255)
      .map((channel) =>
        channel <= 0.03928
          ? channel / 12.92
          : ((channel + 0.055) / 1.055) ** 2.4,
      )
      .reduce(
        (total, channel, index) =>
          total + [0.2126, 0.7152, 0.0722][index] * channel,
        0,
      );
  };
  const contrast = (foreground: string, background: string) => {
    const [lighter, darker] = [
      luminance(foreground),
      luminance(background),
    ].sort((a, b) => b - a);
    return (lighter + 0.05) / (darker + 0.05);
  };

  // Chaque couple encre/fond que l'admin met réellement à l'écran. Les deux
  // thèmes passent par la même liste : une valeur sombre dérivée sans vérifier
  // son contraste est exactement ce que ce test refuse.
  const pairs: Array<[ink: string, background: string, label: string]> = [
    ["text", "page", "texte sur la page"],
    ["text", "card", "texte sur une carte"],
    ["text", "head", "texte sur un en-tête de tableau"],
    ["text-dim", "page", "texte secondaire sur la page"],
    ["text-dim", "card", "texte secondaire sur une carte"],
    ["text-dim", "head", "texte secondaire sur un en-tête"],
    ["text", "sidebar", "texte du menu latéral"],
    ["text-dim", "sidebar", "texte secondaire du menu latéral"],
    ["accent-soft-ink", "card", "accent sur une carte"],
    ["accent-soft-ink", "accent-soft", "pastille accent"],
    ["ok-ink", "ok", "pastille OK"],
    ["warn-ink", "warn", "pastille alerte"],
    ["neutral-ink", "neutral", "pastille neutre"],
    ["danger-ink", "card", "texte danger sur une carte"],
    ["on-accent", "accent", "libellé d'un bouton principal"],
    ["on-accent", "accent-deep", "pastille accent sombre"],
  ];

  for (const [theme, block] of [
    ["clair", adminLight],
    ["sombre", adminDark],
  ] as const) {
    const site = theme === "clair" ? lightBlock : darkBlock;
    it(`garde chaque couple encre/fond au-dessus de 4.5:1 en thème ${theme}`, () => {
      for (const [ink, background, label] of pairs)
        expect(
          contrast(token(block, ink, site), token(block, background, site)),
          `${label} (${theme})`,
        ).toBeGreaterThanOrEqual(4.5);
    });
  }

  // Le brief demande de décliner le sombre depuis les variables existantes,
  // pas d'ouvrir une seconde palette à côté : les surfaces et le texte
  // pointent sur globals.css, seules les teintes propres aux pastilles sont
  // écrites en dur.
  it("dérive ses surfaces sombres des variables du site plutôt que de les réinventer", () => {
    for (const name of ["page", "sidebar", "card", "head", "text", "text-dim"])
      expect(
        adminDark,
        `--admin-${name} devrait suivre le thème du site`,
      ).toMatch(new RegExp(`--admin-${name}:\\s*var\\(--[a-z-]+\\);`));
  });

  // Les classes Tailwind de l'admin (bg-admin-card, text-admin-dim…) sont
  // générées depuis le mapping `@theme inline` en haut du fichier. Une faute
  // de frappe y produit une utilitaire qui pointe sur une variable
  // inexistante : rien ne casse au build, la couleur disparaît simplement à
  // l'écran. Ce test relie les deux bouts.
  it("n'expose en utilitaires Tailwind que des tokens réellement définis", () => {
    const mapped = [
      ...adminCss.matchAll(
        /--(?:color|radius)-admin-[a-z-]+:\s*var\((--admin-[a-z-]+)\);/g,
      ),
    ].map(([, referenced]) => referenced);
    expect(mapped.length).toBeGreaterThan(20);
    for (const referenced of mapped)
      expect(
        adminLight,
        `${referenced} est exposé en utilitaire mais n'est pas défini dans .admin-shell`,
      ).toContain(`${referenced}:`);
  });

  // Et le site public n'hérite de rien de tout ça.
  it("ne touche pas aux tokens du site public", () => {
    expect(adminLight.startsWith(".admin-shell {")).toBe(true);
    expect(adminCss).not.toMatch(/^:root\s*\{[^}]*--admin-/m);
  });
});
