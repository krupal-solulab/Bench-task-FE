import { useMemo, useState } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Handle,
  Position,
  MarkerType,
  type Node,
  type Edge,
  type NodeProps,
  type Connection,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Plus, Trash2, X } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { FormField } from '@/components/common/FormField'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useResetWorkflow, useUpdateWorkflow } from '@/hooks/mutations/useProjectMutations'
import { useToast } from '@/hooks/useToast'
import { toApiError } from '@/lib/error'
import { STATUS_CATEGORIES } from '@/types/workflow.types'
import type { Workflow, WorkflowStatus, WorkflowTransition } from '@/types/workflow.types'

export interface WorkflowCanvasProps {
  projectId: string
  workflow: Workflow
  canManage: boolean
  /** When set, this canvas reads/writes that issue type's workflow override instead of the
   * project-wide default (Workflow Engine v2's per-issue-type workflows). Omit for the default. */
  issueType?: string
}

// Category accent colors matching TaskBoard's column accents, so a status reads the same color
// whether viewed on the board or in this workflow builder.
const CATEGORY_ACCENT: Record<WorkflowStatus['category'], string> = {
  'To Do': '#94a3b8',
  'In Progress': '#3b82f6',
  Done: '#10b981',
}

interface StatusNodeData extends Record<string, unknown> {
  label: string
  category: WorkflowStatus['category']
  selected: boolean
}

function StatusNode({ data }: NodeProps<Node<StatusNodeData>>) {
  return (
    <div
      className="rounded-lg border bg-card px-4 py-2 text-sm shadow-soft"
      style={{
        borderColor: data.selected ? CATEGORY_ACCENT[data.category] : undefined,
        borderWidth: data.selected ? 2 : 1,
      }}
    >
      <Handle type="target" position={Position.Left} />
      <div className="flex items-center gap-2">
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: CATEGORY_ACCENT[data.category] }}
        />
        <span className="font-medium">{data.label}</span>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  )
}

const NODE_TYPES = { status: StatusNode }

/** Lays statuses out in 3 columns by category (matching the board's To Do / In Progress / Done
 * grouping), stacked vertically within each column. Positions are computed fresh every render -
 * not persisted - so the data model stays exactly `{statuses, transitions, initialStatus}`. */
function layoutNodes(statuses: WorkflowStatus[], selectedName: string | null): Node[] {
  const columnX: Record<WorkflowStatus['category'], number> = {
    'To Do': 40,
    'In Progress': 320,
    Done: 600,
  }
  const columnCounts: Record<WorkflowStatus['category'], number> = {
    'To Do': 0,
    'In Progress': 0,
    Done: 0,
  }
  return statuses.map((status) => {
    const y = columnCounts[status.category] * 90 + 40
    columnCounts[status.category] += 1
    return {
      id: status.name,
      type: 'status',
      position: { x: columnX[status.category], y },
      data: {
        label: status.name,
        category: status.category,
        selected: status.name === selectedName,
      },
      draggable: true,
    }
  })
}

function layoutEdges(transitions: WorkflowTransition[], selectedId: string | null): Edge[] {
  return transitions.map((t) => {
    const id = `${t.from}->${t.to}`
    return {
      id,
      source: t.from,
      target: t.to,
      markerEnd: { type: MarkerType.ArrowClosed },
      style: {
        stroke: id === selectedId ? '#6366f1' : '#94a3b8',
        strokeWidth: id === selectedId ? 2 : 1,
      },
      label: t.allowedRoles?.length || t.requireComment ? 'gated' : undefined,
    }
  })
}

/** A visual, node-and-arrow view of the same workflow data `WorkflowSettingsForm` edits - an
 * additional view, not a replacement (see the Workflow tab's Visual/List toggle, defaulting to
 * List). Handles the workflow's shape (statuses + transitions); a transition's Condition/Validator
 * (who may make it / whether it requires a comment first) stays in the List view's per-transition
 * controls, to keep this canvas's interactions simple and reliably testable. */
export function WorkflowCanvas({ projectId, workflow, canManage, issueType }: WorkflowCanvasProps) {
  const [statuses, setStatuses] = useState<WorkflowStatus[]>(workflow.statuses)
  const [transitions, setTransitions] = useState<WorkflowTransition[]>(workflow.transitions)
  const [initialStatus, setInitialStatus] = useState(workflow.initialStatus)
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)

  const updateWorkflow = useUpdateWorkflow(projectId, issueType)
  const resetWorkflow = useResetWorkflow(projectId, issueType)
  const { showToast } = useToast()

  const nodes = useMemo(() => layoutNodes(statuses, selectedStatus), [statuses, selectedStatus])
  const edges = useMemo(
    () => layoutEdges(transitions, selectedEdgeId),
    [transitions, selectedEdgeId],
  )

  function applyWorkflow(next: Workflow) {
    setStatuses(next.statuses)
    setTransitions(next.transitions)
    setInitialStatus(next.initialStatus)
    setSelectedStatus(null)
    setSelectedEdgeId(null)
  }

  function addStatus() {
    const name = `New status ${statuses.length + 1}`
    setStatuses([...statuses, { name, category: 'To Do' }])
    setSelectedStatus(name)
  }

  function renameSelectedStatus(name: string) {
    if (!selectedStatus) return
    setStatuses(statuses.map((s) => (s.name === selectedStatus ? { ...s, name } : s)))
    setTransitions(
      transitions.map((t) => ({
        ...t,
        from: t.from === selectedStatus ? name : t.from,
        to: t.to === selectedStatus ? name : t.to,
      })),
    )
    if (initialStatus === selectedStatus) setInitialStatus(name)
    setSelectedStatus(name)
  }

  function setSelectedStatusCategory(category: WorkflowStatus['category']) {
    if (!selectedStatus) return
    setStatuses(statuses.map((s) => (s.name === selectedStatus ? { ...s, category } : s)))
  }

  function deleteSelectedStatus() {
    if (!selectedStatus) return
    setStatuses(statuses.filter((s) => s.name !== selectedStatus))
    setTransitions(transitions.filter((t) => t.from !== selectedStatus && t.to !== selectedStatus))
    setSelectedStatus(null)
  }

  function onConnect(connection: Connection) {
    if (!connection.source || !connection.target || connection.source === connection.target) return
    const exists = transitions.some(
      (t) => t.from === connection.source && t.to === connection.target,
    )
    if (exists) return
    setTransitions([...transitions, { from: connection.source, to: connection.target }])
  }

  function deleteSelectedEdge() {
    if (!selectedEdgeId) return
    setTransitions(transitions.filter((t) => `${t.from}->${t.to}` !== selectedEdgeId))
    setSelectedEdgeId(null)
  }

  const validStatusNames = statuses.map((s) => s.name.trim()).filter(Boolean)
  const hasDuplicates = new Set(validStatusNames).size !== validStatusNames.length
  const canSave =
    canManage &&
    statuses.length > 0 &&
    statuses.every((s) => s.name.trim().length > 0) &&
    !hasDuplicates &&
    validStatusNames.includes(initialStatus)

  async function handleSave() {
    try {
      const saved = await updateWorkflow.mutateAsync({ statuses, transitions, initialStatus })
      applyWorkflow(saved)
      showToast({ title: 'Workflow updated', variant: 'success' })
    } catch (err) {
      showToast({
        title: 'Could not update workflow',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  async function handleReset() {
    try {
      const reset = await resetWorkflow.mutateAsync()
      applyWorkflow(reset)
      showToast({ title: 'Workflow reset to the system default', variant: 'success' })
    } catch (err) {
      showToast({
        title: 'Could not reset workflow',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  const selectedStatusDef = statuses.find((s) => s.name === selectedStatus) ?? null

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex items-center justify-between">
          <Button type="button" size="sm" variant="outline" onClick={addStatus} className="gap-1">
            <Plus className="h-4 w-4" /> Add status
          </Button>
          <p className="text-xs text-muted-foreground">
            Drag from a status's right edge to another status to add a transition.
          </p>
        </div>
      )}

      <div className="flex gap-4">
        <div data-testid="workflow-canvas" className="h-96 flex-1 rounded-lg border bg-muted/20">
          <ReactFlowProvider>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={NODE_TYPES}
              onConnect={canManage ? onConnect : undefined}
              nodesConnectable={canManage}
              nodesDraggable={canManage}
              elementsSelectable
              onNodeClick={(_, node) => {
                setSelectedStatus(node.id)
                setSelectedEdgeId(null)
              }}
              onEdgeClick={(_, edge) => {
                setSelectedEdgeId(edge.id)
                setSelectedStatus(null)
              }}
              onPaneClick={() => {
                setSelectedStatus(null)
                setSelectedEdgeId(null)
              }}
              fitView
              proOptions={{ hideAttribution: true }}
            >
              <Background />
            </ReactFlow>
          </ReactFlowProvider>
        </div>

        {canManage && selectedStatusDef && (
          <div className="w-64 shrink-0 space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Edit status</h4>
              <button
                type="button"
                aria-label="Close status editor"
                onClick={() => setSelectedStatus(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <FormField label="Name" htmlFor="canvas-status-name">
              <Input
                id="canvas-status-name"
                value={selectedStatusDef.name}
                onChange={(e) => renameSelectedStatus(e.target.value)}
              />
            </FormField>
            <FormField label="Category" htmlFor="canvas-status-category">
              <Select
                value={selectedStatusDef.category}
                onValueChange={(v) => setSelectedStatusCategory(v as WorkflowStatus['category'])}
              >
                <SelectTrigger id="canvas-status-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={deleteSelectedStatus}
              className="w-full gap-1"
            >
              <Trash2 className="h-4 w-4" /> Delete status
            </Button>
          </div>
        )}

        {canManage && selectedEdgeId && !selectedStatusDef && (
          <div className="w-64 shrink-0 space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Transition</h4>
              <button
                type="button"
                aria-label="Close transition editor"
                onClick={() => setSelectedEdgeId(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">{selectedEdgeId.replace('->', ' → ')}</p>
            <p className="text-xs text-muted-foreground">
              Conditions and Validators (who can make it / require a comment first) are edited in
              the List view.
            </p>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={deleteSelectedEdge}
              className="w-full gap-1"
            >
              <Trash2 className="h-4 w-4" /> Delete transition
            </Button>
          </div>
        )}
      </div>

      {hasDuplicates && <p className="text-sm text-destructive">Status names must be unique.</p>}

      {canManage && (
        <FormField label="Initial status" htmlFor="canvas-initial-status">
          <Select value={initialStatus} onValueChange={setInitialStatus}>
            <SelectTrigger id="canvas-initial-status" className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {validStatusNames.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      )}

      {canManage && (
        <div className="flex items-center justify-between border-t pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleReset()}
            loading={resetWorkflow.isPending}
          >
            Reset to default
          </Button>
          <Button
            type="button"
            onClick={() => void handleSave()}
            loading={updateWorkflow.isPending}
            disabled={!canSave}
          >
            Save workflow
          </Button>
        </div>
      )}
    </div>
  )
}
