/**
 * Pure reorder-index math for the Backlog's drag-to-reorder, kept separate from the actual drag
 * handling so it's unit-testable without simulating real pointer/drag events in jsdom — the same
 * reasoning behind `canDragTaskTo` in status-transitions.ts.
 *
 * Call this with the list already reordered by dnd-kit's `arrayMove(ids, oldIndex, newIndex)` —
 * it just reads off the moved item's new neighbors, which is exactly what the backend's
 * PATCH /tasks/:id/rank (beforeTaskId/afterTaskId) expects.
 */
export function computeReorderNeighbors(
  reorderedIds: string[],
  activeId: string,
): { beforeTaskId?: string; afterTaskId?: string } {
  const index = reorderedIds.indexOf(activeId)
  if (index === -1) return {}
  return {
    beforeTaskId: reorderedIds[index - 1],
    afterTaskId: reorderedIds[index + 1],
  }
}
