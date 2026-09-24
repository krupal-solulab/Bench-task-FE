import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { server } from '@/test/mocks/server'
import { DependencyGraphView } from '@/components/projects/DependencyGraphView'
import type { DependencyGraph } from '@/types/issue-link.types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

function mockGraph(graph: DependencyGraph) {
  server.use(
    http.get(url('/projects/:id/dependency-graph'), () =>
      HttpResponse.json({ success: true, data: graph }),
    ),
  )
}

function renderGraph() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    )
  }
  return render(<DependencyGraphView projectId="p-1" />, { wrapper: Wrapper })
}

describe('DependencyGraphView', () => {
  it('shows an empty state when there are no linked issues', async () => {
    mockGraph({ nodes: [], edges: [] })
    renderGraph()

    expect(await screen.findByText('No linked issues yet')).toBeInTheDocument()
  })

  it('renders a node for each internal and external issue', async () => {
    mockGraph({
      nodes: [
        {
          id: 'task-1',
          issueKey: 'PRJ-1',
          title: 'Internal issue',
          status: 'Todo',
          statusCategory: 'To Do',
          issueType: 'Task',
          external: false,
        },
        {
          id: 'task-2',
          issueKey: 'OTH-1',
          title: 'External issue',
          status: 'Done',
          statusCategory: 'Done',
          issueType: 'Task',
          external: true,
          projectName: 'Other Project',
        },
      ],
      edges: [
        {
          id: 'link-1',
          source: 'task-1',
          target: 'task-2',
          linkTypeId: 'blocks',
          linkTypeName: 'Blocks',
          isBlocking: true,
        },
      ],
    })
    renderGraph()

    const canvas = within(await screen.findByTestId('dependency-graph'))
    expect(canvas.getByText('Internal issue')).toBeInTheDocument()
    expect(canvas.getByText('External issue')).toBeInTheDocument()
    expect(canvas.getByText('Other Project')).toBeInTheDocument()
  })
})
