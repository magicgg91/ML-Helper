import { describe, expect, it, vi } from "vitest";
import {
  brandedTitle,
  ogLocale,
  pageMetadata,
  titleTemplate,
} from "./page-metadata";

vi.stubEnv("NEXTAUTH_URL", "https://ml-helper.com");

describe("page-metadata (Bloc 91/E2+E3)", () => {
  it("brands a title with the ML-Helper / Million Lords suffix", () => {
    expect(brandedTitle("Gemmes")).toBe("Gemmes | ML-Helper · Million Lords");
    expect(titleTemplate).toBe("%s | ML-Helper · Million Lords");
  });

  it("maps a locale to its og:locale code, defaulting to fr_FR", () => {
    expect(ogLocale("fr")).toBe("fr_FR");
    expect(ogLocale("de")).toBe("de_DE");
    expect(ogLocale("tr")).toBe("tr_TR");
    expect(ogLocale("unknown")).toBe("fr_FR");
  });

  it("builds canonical, hreflang, Open Graph and Twitter for a page", () => {
    const meta = pageMetadata({
      locale: "en",
      path: "/tools/villes",
      title: "Villes",
      description: "Une description propre.",
    });
    // The document title stays SHORT here; the root layout's title.template
    // adds the brand suffix to the rendered <title> tag.
    expect(meta.title).toBe("Villes");
    expect(meta.description).toBe("Une description propre.");
    expect(meta.alternates?.canonical).toBe(
      "https://ml-helper.com/en/tools/villes",
    );
    expect(meta.alternates?.languages?.fr).toBe(
      "https://ml-helper.com/fr/tools/villes",
    );
    expect(meta.alternates?.languages?.["x-default"]).toBe(
      "https://ml-helper.com/fr/tools/villes",
    );

    const og = meta.openGraph as {
      type: string;
      siteName: string;
      title: string;
      description: string;
      url: string;
      locale: string;
      alternateLocale: string[];
      images: string[];
    };
    // og:title IS branded (Next does not derive it from the document title).
    expect(og.title).toBe("Villes | ML-Helper · Million Lords");
    expect(og.description).toBe("Une description propre.");
    expect(og.url).toBe("https://ml-helper.com/en/tools/villes");
    expect(og.locale).toBe("en_US");
    expect(og.alternateLocale).toContain("fr_FR");
    expect(og.alternateLocale).not.toContain("en_US");
    // Codex P2: a page-level openGraph replaces the layout's, so these must be
    // restated per page rather than inherited.
    expect(og.type).toBe("website");
    expect(og.siteName).toBe("ML-Helper");
    expect(og.images).toEqual(["/opengraph-image"]);

    const tw = meta.twitter as { title: string; description: string };
    expect(tw.title).toBe("Villes | ML-Helper · Million Lords");
    expect(tw.description).toBe("Une description propre.");
  });

  it("switches og:type to article and carries dates + cover for a guide", () => {
    const meta = pageMetadata({
      locale: "fr",
      path: "/guides/mon-guide",
      title: "Guides — Mon guide",
      description: "Résumé.",
      article: {
        publishedTime: "2026-01-01T00:00:00.000Z",
        modifiedTime: "2026-02-01T00:00:00.000Z",
        image: "https://cdn.example/cover.png",
      },
    });
    const og = meta.openGraph as {
      type: string;
      siteName: string;
      publishedTime: string;
      modifiedTime: string;
      images: string[];
    };
    expect(og.type).toBe("article");
    expect(og.siteName).toBe("ML-Helper");
    expect(og.publishedTime).toBe("2026-01-01T00:00:00.000Z");
    expect(og.modifiedTime).toBe("2026-02-01T00:00:00.000Z");
    expect(og.images).toEqual(["https://cdn.example/cover.png"]);
  });
});
