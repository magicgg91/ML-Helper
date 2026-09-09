// Bloc 64/A: public tiles (tools categories, references) are ordered by the
// label the visitor actually reads, in their own locale — the catalog's own
// declaration order carries no meaning to them. Same rule the admin lists
// got at Bloc 62/C, shared here since both public grids need it.
export function sortByLabel<Item>(
  items: readonly Item[],
  label: (item: Item) => string,
  locale: string,
): Item[] {
  return [...items].sort((a, b) => label(a).localeCompare(label(b), locale));
}
