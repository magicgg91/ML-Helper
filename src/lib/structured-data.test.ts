import { describe, expect, it, vi } from "vitest";
import {
  articleJsonLd,
  breadcrumbJsonLd,
  webApplicationJsonLd,
  websiteJsonLd,
} from "./structured-data";

vi.stubEnv("NEXTAUTH_URL", "https://ml-helper.com");

describe("structured-data (Bloc 91/M4)", () => {
  it("emits WebSite + Organization for the home page", () => {
    const data = websiteJsonLd("fr");
    expect(data).toHaveLength(2);
    expect(data[0]["@type"]).toBe("WebSite");
    expect(data[0].url).toBe("https://ml-helper.com/fr");
    expect(data[0].inLanguage).toBe("fr");
    expect(data[1]["@type"]).toBe("Organization");
    expect(data[1].name).toBe("ML-Helper");
    expect(data[1].url).toBe("https://ml-helper.com/");
  });

  it("emits an Article with the guide's author, dates, language and image", () => {
    const data = articleJsonLd({
      locale: "en",
      path: "/guides/x",
      title: "Guide X",
      author: "Jane Doe",
      publishedTime: "2026-01-01T00:00:00.000Z",
      modifiedTime: "2026-02-01T00:00:00.000Z",
      image: "https://cdn.example/x.png",
    });
    expect(data["@type"]).toBe("Article");
    expect(data.headline).toBe("Guide X");
    expect(data.inLanguage).toBe("en");
    expect(data.mainEntityOfPage).toBe("https://ml-helper.com/en/guides/x");
    // Codex review: the guide's own author (Person), site org only as publisher.
    expect(data.author).toEqual({ "@type": "Person", name: "Jane Doe" });
    expect((data.publisher as Record<string, unknown>).name).toBe("ML-Helper");
    expect(data.datePublished).toBe("2026-01-01T00:00:00.000Z");
    expect(data.dateModified).toBe("2026-02-01T00:00:00.000Z");
    expect(data.image).toBe("https://cdn.example/x.png");
  });

  it("falls back to the organization as author and omits image/dates when absent", () => {
    const data = articleJsonLd({ locale: "fr", path: "/guides/y", title: "Y" });
    expect((data.author as Record<string, unknown>)["@type"]).toBe(
      "Organization",
    );
    expect(data.image).toBeUndefined();
    expect(data.datePublished).toBeUndefined();
    expect(data.dateModified).toBeUndefined();
  });

  it("emits a BreadcrumbList with positioned, absolute-URL items", () => {
    const data = breadcrumbJsonLd("fr", [
      { path: "/", label: "Accueil" },
      { path: "/tools", label: "Outils" },
      { path: "/tools/villes", label: "Villes" },
    ]);
    expect(data["@type"]).toBe("BreadcrumbList");
    const items = data.itemListElement as Array<Record<string, unknown>>;
    expect(items).toHaveLength(3);
    expect(items[0]).toMatchObject({
      position: 1,
      name: "Accueil",
      item: "https://ml-helper.com/fr",
    });
    expect(items[2]).toMatchObject({
      position: 3,
      name: "Villes",
      item: "https://ml-helper.com/fr/tools/villes",
    });
  });

  it("emits a free WebApplication in the game category for a tool", () => {
    const data = webApplicationJsonLd({
      locale: "de",
      path: "/tools/villes",
      name: "Städte",
    });
    expect(data["@type"]).toBe("WebApplication");
    expect(data.applicationCategory).toBe("GameApplication");
    expect(data.operatingSystem).toBe("Web");
    expect(data.name).toBe("Städte");
    expect(data.url).toBe("https://ml-helper.com/de/tools/villes");
    expect(data.offers).toEqual({
      "@type": "Offer",
      price: 0,
      priceCurrency: "EUR",
    });
  });
});
