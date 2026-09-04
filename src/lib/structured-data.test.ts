import { describe, expect, it, vi } from "vitest";
import {
  articleJsonLd,
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

  it("emits an Article with dates, language and image for a guide", () => {
    const data = articleJsonLd({
      locale: "en",
      path: "/guides/x",
      title: "Guide X",
      publishedTime: "2026-01-01T00:00:00.000Z",
      modifiedTime: "2026-02-01T00:00:00.000Z",
      image: "https://cdn.example/x.png",
    });
    expect(data["@type"]).toBe("Article");
    expect(data.headline).toBe("Guide X");
    expect(data.inLanguage).toBe("en");
    expect(data.mainEntityOfPage).toBe("https://ml-helper.com/en/guides/x");
    expect(data.datePublished).toBe("2026-01-01T00:00:00.000Z");
    expect(data.dateModified).toBe("2026-02-01T00:00:00.000Z");
    expect(data.image).toBe("https://cdn.example/x.png");
  });

  it("omits image and dates when a guide has none", () => {
    const data = articleJsonLd({ locale: "fr", path: "/guides/y", title: "Y" });
    expect(data.image).toBeUndefined();
    expect(data.datePublished).toBeUndefined();
    expect(data.dateModified).toBeUndefined();
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
