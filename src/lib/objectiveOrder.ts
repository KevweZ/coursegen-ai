/** Move one item in a list. No-op when the index is out of range. */
export function moveArrayItem<T>(list: T[], from: number, to: number): T[] {
  if (!Array.isArray(list) || list.length < 2) return list;
  if (from === to) return list;
  if (from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
