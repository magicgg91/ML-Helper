import { readFileSync } from "node:fs";
import path from "node:path";

// Bloc 96: reading a PNG's own header, with no image dependency, so tests can
// check what a file (or a served response) really is rather than what its name
// or a declaration claims. The blank iOS home-screen icon this bloc fixes is
// exactly the kind of defect that hides behind a correct-looking declaration.
export type PngHeader = {
  width: number;
  height: number;
  bitDepth: number;
  /** PNG colour type: 2 = true colour (RGB), 3 = indexed/palette, 6 = RGBA. */
  colorType: number;
  interlaced: boolean;
  /** Whether the image can carry transparency (alpha channel or tRNS chunk). */
  transparent: boolean;
};

export const truecolorPng = 2;

/** Parses the IHDR (and scans for tRNS) of PNG bytes. Throws if not a PNG. */
export function parsePngHeader(bytes: Buffer): PngHeader {
  if (bytes.subarray(1, 4).toString("ascii") !== "PNG")
    throw new Error("not a PNG file");

  const colorType = bytes.readUInt8(25);
  const header: PngHeader = {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
    bitDepth: bytes.readUInt8(24),
    colorType,
    interlaced: bytes.readUInt8(28) !== 0,
    // Colour types 4 and 6 carry an alpha channel; any type can carry a tRNS
    // chunk instead.
    transparent: colorType === 4 || colorType === 6,
  };

  // Walk the chunk list looking for tRNS. Chunks are length(4) + type(4) +
  // data + crc(4), starting after the 8-byte signature.
  for (let at = 8; at + 8 <= bytes.length;) {
    const length = bytes.readUInt32BE(at);
    const type = bytes.subarray(at + 4, at + 8).toString("ascii");
    if (type === "tRNS") header.transparent = true;
    if (type === "IEND") break;
    at += 12 + length;
  }

  return header;
}

/** Same, for a file named by its path from the repository root. */
export function readPngHeader(repoPath: string): PngHeader {
  return parsePngHeader(readFileSync(path.join(process.cwd(), repoPath)));
}
