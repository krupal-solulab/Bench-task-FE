import { useEffect, useState } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { GripVertical } from 'lucide-react'
import { Modal } from '@/components/common/Modal'
import { Button } from '@/components/common/Button'
import { Checkbox } from '@/components/ui/checkbox'
import { useUpdateDashboardPreferences } from '@/hooks/mutations/useDashboardMutations'
import { useToast } from '@/hooks/useToast'
import { toApiError } from '@/lib/error'
import { cn } from '@/lib/cn'
import type { DashboardWidgetId } from '@/types/dashboard.types'

export interface DashboardCustomizeFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  availableWidgets: Array<{ id: DashboardWidgetId; label: string }>
  order: DashboardWidgetId[]
  hidden: DashboardWidgetId[]
}

interface WidgetRowProps {
  id: DashboardWidgetId
  label: string
  hidden: boolean
  onToggleVisible: (id: DashboardWidgetId) => void
}

/** A single draggable widget row - mirrors BacklogBoard.tsx's own useSortable row pattern (a drag
 * handle rather than the whole row, so the visibility checkbox stays independently clickable). */
function WidgetRow({ id, label, hidden, onToggleVisible }: WidgetRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  })
  const style = {
    transform: transform ? `translate3d(0, ${transform.y}px, 0)` : undefined,
    transition,
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm',
        isDragging && 'opacity-50',
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Drag to reorder ${label}`}
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <Checkbox
        aria-label={`Show ${label}`}
        checked={!hidden}
        onCheckedChange={() => onToggleVisible(id)}
      />
      <span className="flex-1">{label}</span>
    </li>
  )
}

/** Show/hide and reorder the dashboard's widgets via real drag-and-drop (dnd-kit) - upgraded from
 * the earlier plain up/down-button reorder now that dnd-kit is already a dependency elsewhere
 * (BacklogBoard.tsx). */
export function DashboardCustomizeForm({
  open,
  onOpenChange,
  availableWidgets,
  order,
  hidden,
}: DashboardCustomizeFormProps) {
  const [draftOrder, setDraftOrder] = useState(order)
  const [hiddenSet, setHiddenSet] = useState(new Set(hidden))
  const updatePreferences = useUpdateDashboardPreferences()
  const { showToast } = useToast()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  // Re-sync the draft whenever the modal is (re)opened, so a previous edit that wasn't saved
  // doesn't linger the next time it's opened.
  useEffect(() => {
    if (open) {
      setDraftOrder(order)
      setHiddenSet(new Set(hidden))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function toggleVisible(id: DashboardWidgetId) {
    const next = new Set(hiddenSet)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setHiddenSet(next)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = draftOrder.indexOf(active.id as DashboardWidgetId)
    const newIndex = draftOrder.indexOf(over.id as DashboardWidgetId)
    if (oldIndex === -1 || newIndex === -1) return
    setDraftOrder(arrayMove(draftOrder, oldIndex, newIndex))
  }

  async function handleSave() {
    try {
      await updatePreferences.mutateAsync({
        hiddenWidgets: [...hiddenSet],
        widgetOrder: draftOrder,
      })
      showToast({ title: 'Dashboard layout saved', variant: 'success' })
      onOpenChange(false)
    } catch (err) {
      showToast({
        title: 'Could not save dashboard layout',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  const labelById = new Map(availableWidgets.map((w) => [w.id, w.label]))

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Customize dashboard">
      <div className="space-y-4">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={draftOrder} strategy={verticalListSortingStrategy}>
            <ul className="space-y-1.5">
              {draftOrder.map((id) => (
                <WidgetRow
                  key={id}
                  id={id}
                  label={labelById.get(id) ?? id}
                  hidden={hiddenSet.has(id)}
                  onToggleVisible={toggleVisible}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleSave()}
            loading={updatePreferences.isPending}
          >
            Save layout
          </Button>
        </div>
      </div>
    </Modal>
  )
}
