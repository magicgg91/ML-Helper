import { inflateSync } from "node:zlib";
import { parsePngHeader } from "./png-header";

// Bloc 105: reading the pixels a page really painted, with no image
// dependency — same reasoning as png-header.ts one bloc family earlier. The
// iOS status-bar blur this bloc chases depends on whether the top edge of the
// page resolves to ONE flat colour, which is a fact about rendered pixels and
// nothing a CSS rule can be read to promise on its own.
//
// Handles what Playwright's screenshots actually are: 8-bit non-interlaced
// RGB or RGBA. Anything else throws rather than guessing.
export type Pixel = { r: number; g: number; b: number };

/** Every pixel of a PNG, row-major, as {r,g,b}. Alpha is dropped. */
export function decodePngPixels(bytes: Buffer): {
  width: number;
  height: number;
  at: (x: number, y: number) => Pixel;
} {
  const header = parsePngHeader(bytes);
  if (header.bitDepth !== 8 || header.interlaced)
    throw new Error("only 8-bit non-interlaced PNGs are supported");
  if (header.colorType !== 2 && header.colorType !== 6)
    throw new Error(`unsupported PNG colour type ${header.colorType}`);
  const channels = header.colorType === 6 ? 4 : 3;

  // Concatenate every IDAT chunk, then inflate: the compressed stream is one
  // zlib stream split across chunks at arbitrary boundaries.
  const parts: Buffer[] = [];
  for (let at = 8; at + 8 <= bytes.length;) {
    const length = bytes.readUInt32BE(at);
    const type = bytes.subarray(at + 4, at + 8).toString("ascii");
    if (type === "IDAT") parts.push(bytes.subarray(at + 8, at + 8 + length));
    if (type === "IEND") break;
    at += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(parts));

  // Un-filter, per PNG's five scanline filter types. Each row is prefixed by
  // its filter byte and reconstructed from the row above and the pixel to the
  // left, so rows have to be walked in order.
  const stride = header.width * channels;
  const out = Buffer.alloc(stride * header.height);
  for (let y = 0; y < header.height; y += 1) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let i = 0; i < stride; i += 1) {
      const left = i >= channels ? out[y * stride + i - channels] : 0;
      const up = y > 0 ? out[(y - 1) * stride + i] : 0;
      const upLeft =
        y > 0 && i >= channels ? out[(y - 1) * stride + i - channels] : 0;
      let value: number;
      switch (filter) {
        case 0:
          value = line[i];
          break;
        case 1:
          value = line[i] + left;
          break;
        case 2:
          value = line[i] + up;
          break;
        case 3:
          value = line[i] + ((left + up) >> 1);
          break;
        case 4: {
          const p = left + up - upLeft;
          const dLeft = Math.abs(p - left);
          const dUp = Math.abs(p - up);
          const dUpLeft = Math.abs(p - upLeft);
          const nearest =
            dLeft <= dUp && dLeft <= dUpLeft
              ? left
              : dUp <= dUpLeft
                ? up
                : upLeft;
          value = line[i] + nearest;
          break;
        }
        default:
          throw new Error(`unknown PNG filter type ${filter}`);
      }
      out[y * stride + i] = value & 0xff;
    }
  }

  return {
    width: header.width,
    height: header.height,
    at: (x, y) => {
      const i = y * stride + x * channels;
      return { r: out[i], g: out[i + 1], b: out[i + 2] };
    },
  };
}

/** `#rrggbb`, so a failing assertion names a colour a human can recognise. */
export function toHex({ r, g, b }: Pixel): string {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * The distinct colours found in a horizontal band, as hex, most common first.
 * A flat band yields exactly one.
 */
export function bandColours(
  image: ReturnType<typeof decodePngPixels>,
  topY: number,
  height: number,
): string[] {
  const counts = new Map<string, number>();
  for (let y = topY; y < Math.min(topY + height, image.height); y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const hex = toHex(image.at(x, y));
      counts.set(hex, (counts.get(hex) ?? 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([hex]) => hex);
}
