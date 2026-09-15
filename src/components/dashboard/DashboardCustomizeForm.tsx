import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Modal } from '@/components/common/Modal'
import { Button } from '@/components/common/Button'
import { Checkbox } from '@/components/ui/checkbox'
import { useUpdateDashboardPreferences } from '@/hooks/mutations/useDashboardMutations'
import { useToast } from '@/hooks/useToast'
import { toApiError } from '@/lib/error'
import type { DashboardWidgetId } from '@/types/dashboard.types'

export interface DashboardCustomizeFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  availableWidgets: Array<{ id: DashboardWidgetId; label: string }>
  order: DashboardWidgetId[]
  hidden: DashboardWidgetId[]
}

/** Show/hide and reorder the dashboard's widgets - no drag-and-drop, just plain checkboxes and
 * up/down buttons (see Phase 6 plan for why: keeps this dependency-free). */
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

  function move(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= draftOrder.length) return
    const next = [...draftOrder]
    ;[next[index], next[target]] = [next[target]!, next[index]!]
    setDraftOrder(next)
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
        <ul className="space-y-1.5">
          {draftOrder.map((id, index) => (
            <li key={id} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
              <Checkbox
                aria-label={`Show ${labelById.get(id)}`}
                checked={!hiddenSet.has(id)}
                onCheckedChange={() => toggleVisible(id)}
              />
              <span className="flex-1">{labelById.get(id)}</span>
              <button
                type="button"
                onClick={() => move(index, -1)}
                disabled={index === 0}
                aria-label={`Move ${labelById.get(id)} up`}
                className="text-muted-foreground hover:text-foreground disabled:opacity-30"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                disabled={index === draftOrder.length - 1}
                aria-label={`Move ${labelById.get(id)} down`}
                className="text-muted-foreground hover:text-foreground disabled:opacity-30"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>

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
