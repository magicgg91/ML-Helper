/**
 * Bloc 119: the dashboard's "Activité récente" block.
 *
 * An admin saving a screen writes one audit row per save, so a few minutes of
 * work on the same table fills the block with the same sentence five times
 * and pushes everything else off it. Consecutive rows by the same author with
 * the same message are folded into one line carrying a ×N pill and the span
 * of time they cover; the individual times stay available underneath.
 *
 * "Consecutive" is meant literally — adjacent in the list, which is ordered
 * newest first. Two identical saves separated by somebody else's action stay
 * two lines, because what happened in between is part of the story.
 */

export type ActivityEntry = {
  id: string;
  author: string;
  /** The audit sentence, already resolved in the admin's language. */
  message: string;
  at: Date;
};

export type ActivityGroup = {
  /** The id of the first entry — stable enough to key the row on. */
  key: string;
  author: string;
  message: string;
  /** Every time the action was repeated, newest first. */
  times: Date[];
};

export function groupConsecutiveActivity(
  entries: readonly ActivityEntry[],
): ActivityGroup[] {
  const groups: ActivityGroup[] = [];
  for (const entry of entries) {
    const last = groups.at(-1);
    if (last && last.author === entry.author && last.message === entry.message)
      last.times.push(entry.at);
    else
      groups.push({
        key: entry.id,
        author: entry.author,
        message: entry.message,
        times: [entry.at],
      });
  }
  return groups;
}
