// Newest first, with a deterministic tie-break by id (slug) so entries that
// share the same date never fall back to the collection's glob order.
export function byDateDesc<T extends { id: string; data: { date: Date } }>(a: T, b: T): number {
  const diff = b.data.date.valueOf() - a.data.date.valueOf();
  return diff !== 0 ? diff : a.id.localeCompare(b.id);
}
