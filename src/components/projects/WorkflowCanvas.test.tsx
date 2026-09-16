import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { ToastProvider } from '@/context/ToastContext'
import { WorkflowCanvas } from '@/components/projects/WorkflowCanvas'
import type { Workflow } from '@/types/workflow.types'

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
function renderCanvas(workflow: Workflow = DEFAULT_WORKFLOW, canManage = true) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ToastProvider>{children}</ToastProvider>
      </QueryClientProvider>
    )
  }
  return render(<WorkflowCanvas projectId="p-1" workflow={workflow} canManage={canManage} />, {
    wrapper: Wrapper,
  })
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

  it('deleting the selected status removes its node and closes the editor', async () => {
    const user = userEvent.setup()
    renderCanvas()

    fireEvent.click(screen.getByTestId('rf__node-Done'))
    await user.click(screen.getByRole('button', { name: /Delete status/ }))

    expect(screen.queryByTestId('rf__node-Done')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument()
  })
})
