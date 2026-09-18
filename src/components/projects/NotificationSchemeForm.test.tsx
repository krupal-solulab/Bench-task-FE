import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { ToastProvider } from '@/context/ToastContext'
import { ToastViewport } from '@/components/common/Toast'
import { server } from '@/test/mocks/server'
import { NotificationSchemeForm } from '@/components/projects/NotificationSchemeForm'
import type { NotificationSchemeRule } from '@/types/notification-scheme.types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

function renderForm(notificationScheme: NotificationSchemeRule[] = [], canManage = true) {
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
  return render(
    <NotificationSchemeForm
      projectId="p-1"
      notificationScheme={notificationScheme}
      canManage={canManage}
    />,
    { wrapper: Wrapper },
  )
}

describe('NotificationSchemeForm', () => {
  it('renders a row for every one of the 5 configurable events, unconfigured by default (regression)', () => {
    renderForm()

    expect(screen.getByText('Issue assigned')).toBeInTheDocument()
    expect(screen.getByText('Comment added')).toBeInTheDocument()
    expect(screen.getByText('Status changed')).toBeInTheDocument()
    expect(screen.getByText('Sprint started')).toBeInTheDocument()
    expect(screen.getByText('Sprint completed')).toBeInTheDocument()
    expect(screen.getByLabelText('Notify Admin on Comment added')).not.toBeChecked()
  })

  it('shows a read-only summary (no editing controls) when canManage is false', () => {
    renderForm([{ event: 'Commented', notifyRoles: ['Manager'], channels: ['InApp'] }], false)

    expect(
      screen.queryByRole('button', { name: 'Save notification scheme' }),
    ).not.toBeInTheDocument()
    expect(screen.getByText(/Comment added.*notifies Manager via In-app/)).toBeInTheDocument()
  })

  it('shows a read-only empty state when nothing is configured and canManage is false', () => {
    renderForm([], false)
    expect(screen.getByText(/No extra notification routing configured/)).toBeInTheDocument()
  })

  it('disables Save when roles are selected but no channel is chosen', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByLabelText('Notify Manager on Comment added'))

    expect(screen.getByText('Select at least one channel.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save notification scheme' })).toBeDisabled()
  })

  it('checking a role and a channel, then saving, sends the updated scheme via PUT', async () => {
    let sentBody: { rules: NotificationSchemeRule[] } | null = null
    server.use(
      http.put(url('/projects/p-1/notification-scheme'), async ({ request }) => {
        sentBody = (await request.json()) as typeof sentBody
        return HttpResponse.json({
          success: true,
          data: { id: 'p-1', notificationScheme: sentBody!.rules },
        })
      }),
    )
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByLabelText('Notify Manager on Comment added'))
    await user.click(screen.getByLabelText('Notify via In-app on Comment added'))
    await user.click(screen.getByRole('button', { name: 'Save notification scheme' }))

    await waitFor(() => expect(sentBody).not.toBeNull())
    expect(sentBody!.rules).toContainEqual({
      event: 'Commented',
      notifyRoles: ['Manager'],
      channels: ['InApp'],
    })
    // Every other event is unaffected - still unconfigured, exactly as before this change.
    expect(sentBody!.rules).toContainEqual({ event: 'Assigned', notifyRoles: [], channels: [] })
    expect(await screen.findByText('Notification scheme updated')).toBeInTheDocument()
  })

  it('shows an error toast when the server rejects the save', async () => {
    server.use(
      http.put(url('/projects/p-1/notification-scheme'), () =>
        HttpResponse.json(
          { success: false, message: 'Select at least one channel for the "Commented" entry' },
          { status: 400 },
        ),
      ),
    )
    const user = userEvent.setup()
    renderForm([{ event: 'Commented', notifyRoles: ['Manager'], channels: ['InApp'] }])

    await user.click(screen.getByRole('button', { name: 'Save notification scheme' }))

    expect(await screen.findByText('Could not update notification scheme')).toBeInTheDocument()
  })
})
