import { ImageResponse } from "next/og";

// Bloc 91/E3: the site-wide Open Graph / Twitter share image. As a root-level
// file convention it applies to every route (public pages, and harmlessly the
// noindex admin), so a link shared to Discord/Reddit always renders with a
// card. Guide pages can still override it with their own cover (see
// guides/[slug] metadata). Generated with next/og rather than shipped as a
// binary: no asset to keep in sync, and the text is brand/game names only
// (ML-Helper, Million Lords) so one image serves all five languages.
export const alt = "ML-Helper — Million Lords";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Matches the site's dark-first palette (globals.css --bg / --violet-bright).
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #12161d 0%, #1b1730 100%)",
        color: "#f4f5f7",
      }}
    >
      <div style={{ fontSize: 128, fontWeight: 700, letterSpacing: -2 }}>
        ML-Helper
      </div>
      <div
        style={{
          marginTop: 12,
          fontSize: 48,
          color: "#b79be0",
          letterSpacing: 1,
        }}
      >
        Million Lords · outils &amp; guides
      </div>
    </div>,
    { ...size },
  );
}
