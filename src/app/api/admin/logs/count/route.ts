import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizedSession, forbiddenResponse } from "@/auth/api-authorization";
import { prisma } from "@/lib/prisma";

/**
 * Bloc 119: how many entries a purge would delete.
 *
 * The confirmation dialog announces the exact number before anything is
 * deleted (§3), and a number can only come from the server — the screen holds
 * one page of the log, not the whole of it.
 *
 * Gated on logs.purge, not on logs.view: this answers a question only the
 * account about to purge needs, and it is the same capability the DELETE
 * below it requires.
 */
export async function GET(request: Request) {
  const session = await authorizedSession("logs.purge");
  if (!session) return forbiddenResponse();
  const { searchParams } = new URL(request.url);
  const parsed = z
    .object({ start: z.coerce.date(), end: z.coerce.date() })
    .safeParse({
      start: searchParams.get("start"),
      end: searchParams.get("end"),
    });
  if (!parsed.success || parsed.data.start > parsed.data.end)
    return NextResponse.json({ error: "invalid_range" }, { status: 400 });
  return NextResponse.json({
    count: await prisma.auditLog.count({
      where: {
        createdAt: { gte: parsed.data.start, lte: parsed.data.end },
      },
    }),
  });
}
