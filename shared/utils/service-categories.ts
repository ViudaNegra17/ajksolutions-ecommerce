export function wouldCreateServiceCategoryCycle(
  categoryId: string | null,
  parentId: string | null | undefined,
  ancestorIds: Iterable<string>
) {
  if (!categoryId || !parentId) return false
  if (categoryId === parentId) return true
  const visited = new Set<string>()
  for (const ancestorId of ancestorIds) {
    if (ancestorId === categoryId || visited.has(ancestorId)) return true
    visited.add(ancestorId)
  }
  return false
}
