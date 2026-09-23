import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { ToastProvider } from '@/context/ToastContext'
import { ToastViewport } from '@/components/common/Toast'
import { server } from '@/test/mocks/server'
import { TicketAutomationRulesForm } from './TicketAutomationRulesForm'
import type { TicketAutomationRule } from '@/types/ticket.types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

function renderForm(rules: TicketAutomationRule[] = [], canManage = true) {
  server.use(
    http.get(url('/tickets/settings/automation-rules'), () =>
      HttpResponse.json({ success: true, data: rules }),
    ),
  )
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          {children}
          <ToastViewport />
        </ToastProvider>
      </QueryClientProvider>
    )
  }
  return render(<TicketAutomationRulesForm canManage={canManage} />, { wrapper: Wrapper })
}

describe('TicketAutomationRulesForm', () => {
  it('shows a read-only summary (no editing controls) when canManage is false', async () => {
    renderForm(
      [
        {
          id: 'r-1',
          name: 'Escalate urgent tickets',
          enabled: true,
          trigger: { type: 'TicketCreated', toStatus: null },
          conditions: [],
          actions: [{ type: 'AddTags', value: 'vip' }],
        },
      ],
      false,
    )

    expect(await screen.findByText('Escalate urgent tickets', { exact: false })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save trigger rules' })).not.toBeInTheDocument()
  })

  it('adds a rule via "Add rule" and saves it', async () => {
    let sentBody: { rules: Array<Record<string, unknown>> } | null = null
    server.use(
      http.put(url('/tickets/settings/automation-rules'), async ({ request }) => {
        sentBody = (await request.json()) as typeof sentBody
        return HttpResponse.json({ success: true, data: sentBody!.rules })
      }),
    )
    const user = userEvent.setup()
    renderForm()

    await user.click(await screen.findByRole('button', { name: /Add rule/ }))
    await user.type(screen.getByLabelText('Rule 1 name'), 'Welcome new tickets')
    await user.type(screen.getByLabelText('Rule 1 action 1 value'), 'triage')

    await user.click(screen.getByRole('button', { name: 'Save trigger rules' }))

    await waitFor(() => expect(sentBody).not.toBeNull())
    expect(sentBody!.rules).toEqual([
      {
        name: 'Welcome new tickets',
        enabled: true,
        trigger: { type: 'TicketCreated', toStatus: null },
        conditions: [],
        actions: [{ type: 'AddTags', value: 'triage' }],
      },
    ])
    expect(await screen.findByText('Automation rules updated')).toBeInTheDocument()
  })

  it('shows a target-status selector only when the trigger is Status Changed', async () => {
    renderForm([
      {
        id: 'r-1',
        name: 'Created rule',
        enabled: true,
        trigger: { type: 'TicketCreated', toStatus: null },
        conditions: [],
        actions: [{ type: 'AddTags', value: 'a' }],
      },
      {
        id: 'r-2',
        name: 'Status rule',
        enabled: true,
        trigger: { type: 'TicketStatusChanged', toStatus: 'Solved' },
        conditions: [],
        actions: [{ type: 'AddTags', value: 'a' }],
      },
    ])

    await screen.findByDisplayValue('Status rule')
    expect(screen.queryByLabelText('Rule 1 target status')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Rule 2 target status')).toBeInTheDocument()
  })

  it('disables Save until the rule has a name and an action with a value', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(await screen.findByRole('button', { name: /Add rule/ }))

    expect(screen.getByRole('button', { name: 'Save trigger rules' })).toBeDisabled()
  })

  it('removes a rule', async () => {
    const user = userEvent.setup()
    renderForm([
      {
        id: 'r-1',
        name: 'Rule A',
        enabled: true,
        trigger: { type: 'TicketCreated', toStatus: null },
        conditions: [],
        actions: [{ type: 'AddTags', value: 'a' }],
      },
    ])

    await user.click(await screen.findByLabelText('Remove rule Rule A'))

    expect(screen.queryByDisplayValue('Rule A')).not.toBeInTheDocument()
  })

  it('shows a role selector for a NotifyRole action and a URL input for a Webhook action', async () => {
    renderForm([
      {
        id: 'r-1',
        name: 'Notify rule',
        enabled: true,
        trigger: { type: 'TicketCreated', toStatus: null },
        conditions: [],
        actions: [{ type: 'NotifyRole', value: 'Manager' }],
      },
      {
        id: 'r-2',
        name: 'Webhook rule',
        enabled: true,
        trigger: { type: 'TicketCreated', toStatus: null },
        conditions: [],
        actions: [{ type: 'Webhook', value: 'https://example.com/hook' }],
      },
    ])

    await screen.findByDisplayValue('Notify rule')
    expect(screen.getByRole('combobox', { name: 'Rule 1 action 1 value' })).toHaveTextContent(
      'Manager',
    )
    expect(screen.getByLabelText('Rule 2 action 1 value')).toHaveValue('https://example.com/hook')
  })
})
