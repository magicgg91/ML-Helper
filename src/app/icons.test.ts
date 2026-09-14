import { describe, expect, it } from "vitest";
import { readPngHeader, truecolorPng } from "@/test/png-header";

// Bloc 96: iOS created the home-screen shortcut but drew an empty tile — no
// icon, and not even its usual fallback. Everything the markup could get wrong
// was already right (the file sat at the app root, the <link rel=
// "apple-touch-icon"> tag was in the served HTML, its URL answered 200 with a
// valid PNG, and nothing declared a competing `icons` metadata object), which
// left what the file itself was: one 512×512 icon — a size Apple documents
// nowhere — encoded as an indexed/palette PNG to save bytes.
//
// So the icons are now the sizes Apple's own guide lists, as plain opaque
// true-colour PNGs. This file pins both properties, because both are the kind
// of thing a later size or weight optimisation would quietly undo, and neither
// can be caught by looking at a page in a desktop browser.
//
// Regenerated from the 1254×1254 source with sharp:
//   .resize(size, size, { fit: "cover" })
//   .flatten({ background: "#1b2029" })
//   .png({ compressionLevel: 9, palette: false })
const shippedIcons = [
  // Apple's documented home-screen sizes: iPad @2x, iPad Pro, iPhone @3x.
  // Next.js emits one <link rel="apple-touch-icon"> per file, ascending, with
  // the size read from the file itself (apple-icon.png, apple-icon1.png, … is
  // its multiple-icon convention).
  { file: "src/app/apple-icon.png", size: 152 },
  { file: "src/app/apple-icon1.png", size: 167 },
  { file: "src/app/apple-icon2.png", size: 180 },
  // The well-known path iOS requests on its own when the markup gives it
  // nothing it can use — a plain static file, no hashed query string.
  { file: "public/apple-touch-icon.png", size: 180 },
  // The two the PWA spec and Chrome's install criteria ask for. 192 is also
  // the <link rel="icon"> the browser tab uses.
  { file: "src/app/icon.png", size: 192 },
  { file: "public/icon-512.png", size: 512 },
];

describe("installable icon files", () => {
  it.each(shippedIcons)(
    "$file is a square $size×$size PNG",
    ({ file, size }) => {
      const png = readPngHeader(file);
      expect({ width: png.width, height: png.height }).toEqual({
        width: size,
        height: size,
      });
    },
  );

  it.each(shippedIcons)(
    "$file is the plain opaque true-colour PNG an OS icon pipeline expects",
    ({ file }) => {
      const png = readPngHeader(file);
      // Not indexed/palette: cheaper in bytes, but an unusual thing to hand to
      // an icon pipeline, and one of the two suspects for the blank iOS tile.
      expect(png.colorType).toBe(truecolorPng);
      expect(png.bitDepth).toBe(8);
      // Interlaced PNGs and transparency are both long-standing sources of
      // broken or black home-screen icons; the artwork needs neither.
      expect(png.interlaced).toBe(false);
      expect(png.transparent).toBe(false);
    },
  );

  it("ships an icon at the size an iPhone actually asks for", () => {
    // The regression that started this bloc: 512×512 was the only size on
    // offer, and no Apple device asks for it.
    expect(shippedIcons.map((icon) => icon.size)).toContain(180);
  });
});
