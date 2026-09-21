import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { ToastProvider } from '@/context/ToastContext'
import { WorkflowCanvas } from '@/components/projects/WorkflowCanvas'
import type { Workflow } from '@/types/workflow.types'
import type { AutomationRule } from '@/types/project.types'
import { countRulesForTransition } from '@/lib/workflow-automation-badge'

const DEFAULT_WORKFLOW: Workflow = {
  statuses: [
    { name: 'Todo', category: 'To Do' },
    { name: 'In Progress', category: 'In Progress' },
    { name: 'Done', category: 'Done' },
  ],
  transitions: [
    { from: 'Todo', to: 'In Progress' },
    { from: 'In Progress', to: 'Done' },
  ],
  initialStatus: 'Todo',
}

// Drag/connect gestures (creating a transition by dragging between node handles, repositioning a
// node) are not reliably testable under jsdom+userEvent - a documented limitation of this
// environment for complex pointer interactions (the same reason Permission Schemes' pickers use
// click-swatches instead of a drag/drop UI): @xyflow/react wires d3-drag's mousedown listener onto
// every draggable node, and d3-drag reads `event.view.document`, which jsdom's synthetic mouse
// events emitted by full userEvent.click pointer sequences leave unset, throwing. Node selection
// below uses plain `fireEvent.click` (a single click event, no mousedown/mouseup pair) to select a
// node without triggering that drag listener - this canvas is an additional, less rigorously-
// tested view by design; the List view (WorkflowSettingsForm) stays the fully userEvent-covered one.
function renderCanvas(
  workflow: Workflow = DEFAULT_WORKFLOW,
  canManage = true,
  automationRules: AutomationRule[] = [],
) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ToastProvider>{children}</ToastProvider>
      </QueryClientProvider>
    )
  }
  return render(
    <WorkflowCanvas
      projectId="p-1"
      workflow={workflow}
      canManage={canManage}
      automationRules={automationRules}
    />,
    { wrapper: Wrapper },
  )
}

describe('WorkflowCanvas', () => {
  it('renders a node for every status', () => {
    renderCanvas()
    const canvas = within(screen.getByTestId('workflow-canvas'))

    expect(canvas.getByText('Todo')).toBeInTheDocument()
    expect(canvas.getByText('In Progress')).toBeInTheDocument()
    expect(canvas.getByText('Done')).toBeInTheDocument()
  })

  it('renders the canvas but hides editing controls when canManage is false', () => {
    renderCanvas(DEFAULT_WORKFLOW, false)

    expect(screen.getByTestId('workflow-canvas')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Add status/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save workflow' })).not.toBeInTheDocument()
  })

  it('adds a new status node via "Add status" and opens its editor', async () => {
    const user = userEvent.setup()
    renderCanvas()

    await user.click(screen.getByRole('button', { name: /Add status/ }))

    expect(screen.getByLabelText('Name')).toBeInTheDocument()
    expect(screen.getByDisplayValue('New status 4')).toBeInTheDocument()
  })

  it('clicking a status node opens its editor panel, and renaming it updates the node', () => {
    renderCanvas()

    fireEvent.click(screen.getByTestId('rf__node-Todo'))
    const nameInput = screen.getByLabelText('Name')
    expect(nameInput).toHaveValue('Todo')

    // A single fireEvent.change (rather than clear+type) avoids the node's id - which this
    // canvas ties to the status name - passing through a transient empty/colliding value on
    // every keystroke, which is otherwise a fragile intermediate state for @xyflow/react's own
    // per-node reconciliation under jsdom (a component this fragile only for the Visual view -
    // see this file's file-level note on drag/connect jsdom limitations).
    fireEvent.change(nameInput, { target: { value: 'Backlog' } })

    expect(screen.getByDisplayValue('Backlog')).toBeInTheDocument()
  })

  // Edges don't render under jsdom (no layout measurement for path geometry - see this file's
  // own note on drag/connect limitations), so the "N automation rules" badge is verified against
  // the exported pure counting function directly, not via a simulated edge click.
  it('counts only enabled rules scoped to the exact from->to transition (Phase 2 gap-closure)', () => {
    const rules: AutomationRule[] = [
      {
        id: 'r1',
        name: 'Notify on progress',
        enabled: true,
        trigger: { type: 'StatusChanged', toStatus: 'In Progress', fromStatus: 'Todo' },
        conditions: [],
        actions: [],
      },
      {
        id: 'r2',
        name: 'Disabled rule',
        enabled: false,
        trigger: { type: 'StatusChanged', toStatus: 'In Progress', fromStatus: 'Todo' },
        conditions: [],
        actions: [],
      },
      {
        id: 'r3',
        name: 'Any status -> In Progress',
        enabled: true,
        trigger: { type: 'StatusChanged', toStatus: 'In Progress' },
        conditions: [],
        actions: [],
      },
      {
        id: 'r4',
        name: 'Unrelated transition',
        enabled: true,
        trigger: { type: 'StatusChanged', toStatus: 'Done', fromStatus: 'In Progress' },
        conditions: [],
        actions: [],
      },
    ]

    expect(countRulesForTransition(rules, 'Todo', 'In Progress')).toBe(2)
    expect(countRulesForTransition(rules, 'In Progress', 'Done')).toBe(1)
    expect(countRulesForTransition(rules, 'Done', 'Todo')).toBe(0)
  })

  it('renders without crashing when automation rules are provided as a prop (Phase 2 gap-closure)', () => {
    const rules: AutomationRule[] = [
      {
        id: 'r1',
        name: 'Notify on progress',
        enabled: true,
        trigger: { type: 'StatusChanged', toStatus: 'In Progress', fromStatus: 'Todo' },
        conditions: [],
        actions: [],
      },
    ]
    renderCanvas(DEFAULT_WORKFLOW, true, rules)

    expect(screen.getByTestId('workflow-canvas')).toBeInTheDocument()
  })

  it('deleting the selected status removes its node and closes the editor', async () => {
    const user = userEvent.setup()
    renderCanvas()

    fireEvent.click(screen.getByTestId('rf__node-Done'))
    await user.click(screen.getByRole('button', { name: /Delete status/ }))

    expect(screen.queryByTestId('rf__node-Done')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument()
  })
})
