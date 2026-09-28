import type { Prisma } from "@prisma/client";

/**
 * Bloc 119 §3 bis: the client a Prisma interactive transaction hands its
 * callback.
 *
 * Named here because two admin services now come in both shapes — one that
 * opens its own transaction, and one that joins the caller's, so a screen
 * with a single save button can write everything it owns atomically.
 */
export type AdminTransaction = Prisma.TransactionClient;
