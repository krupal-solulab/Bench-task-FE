import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { server } from '@/test/mocks/server'
import { AutomationLogList } from '@/components/projects/AutomationLogList'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`
const PROJECT_ID = 'p-1'

function emptyMeta(total = 0) {
  return {
    total,
    page: 1,
    limit: 10,
    totalPages: total === 0 ? 0 : 1,
    hasNextPage: false,
    hasPrevPage: false,
  }
}

function renderList() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
  return render(<AutomationLogList projectId={PROJECT_ID} />, { wrapper: Wrapper })
}

describe('AutomationLogList', () => {
  it('shows an empty state when there is no automation activity yet', async () => {
    server.use(
      http.get(url(`/projects/${PROJECT_ID}/automation-log`), () =>
        HttpResponse.json({ success: true, data: [], meta: emptyMeta() }),
      ),
    )
    renderList()
    expect(await screen.findByText('No automation activity yet')).toBeInTheDocument()
  })

  it('renders a successful entry with its rule, trigger, task, and action summary', async () => {
    server.use(
      http.get(url(`/projects/${PROJECT_ID}/automation-log`), () =>
        HttpResponse.json({
          success: true,
          data: [
            {
              id: 'log-1',
              ruleId: 'r-1',
              ruleName: 'Welcome new issues',
              triggerType: 'IssueCreated',
              actionSummaries: ['AddLabels: triage'],
              outcome: 'success',
              errorMessage: null,
              task: { id: 't-1', title: 'New bug', issueKey: 'PRJ-1' },
              createdAt: '2026-01-01T00:00:00.000Z',
            },
          ],
          meta: emptyMeta(1),
        }),
      ),
    )
    renderList()

    expect(await screen.findByText('Welcome new issues', { exact: false })).toBeInTheDocument()
    expect(screen.getByText('PRJ-1 · New bug')).toBeInTheDocument()
    expect(screen.getByText('AddLabels: triage')).toBeInTheDocument()
    expect(screen.getByText('Success')).toBeInTheDocument()
  })

  it("renders a failed entry's error message", async () => {
    server.use(
      http.get(url(`/projects/${PROJECT_ID}/automation-log`), () =>
        HttpResponse.json({
          success: true,
          data: [
            {
              id: 'log-1',
              ruleId: 'r-1',
              ruleName: 'Bad rule',
              triggerType: 'StatusChanged',
              actionSummaries: ['SetStatus: Done'],
              outcome: 'failure',
              errorMessage: 'Cannot transition from Todo to Done',
              task: { id: 't-1', title: 'A task', issueKey: 'PRJ-1' },
              createdAt: '2026-01-01T00:00:00.000Z',
            },
          ],
          meta: emptyMeta(1),
        }),
      ),
    )
    renderList()

    expect(await screen.findByText('Failed')).toBeInTheDocument()
    expect(screen.getByText('Cannot transition from Todo to Done')).toBeInTheDocument()
  })
})
