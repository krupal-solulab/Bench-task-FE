import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { ToastProvider } from '@/context/ToastContext'
import { ToastViewport } from '@/components/common/Toast'
import { server } from '@/test/mocks/server'
import { LinkTypesSettingsForm } from '@/components/admin/LinkTypesSettingsForm'
import type { LinkType } from '@/types/issue-link.types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

const DEFAULT_TYPES: LinkType[] = [
  { id: 'blocks', name: 'Blocks', inverseName: 'Is Blocked By', isBlocking: true },
  { id: 'relates-to', name: 'Relates To', inverseName: 'Relates To', isBlocking: false },
]

function mockLinkTypes(types: LinkType[] = DEFAULT_TYPES) {
  server.use(http.get(url('/link-types'), () => HttpResponse.json({ success: true, data: types })))
}

function renderForm() {
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
  return render(<LinkTypesSettingsForm />, { wrapper: Wrapper })
}

describe('LinkTypesSettingsForm', () => {
  it('loads and displays the existing link types', async () => {
    mockLinkTypes()
    renderForm()

    expect(await screen.findByDisplayValue('Blocks')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Is Blocked By')).toBeInTheDocument()
    expect(screen.getAllByDisplayValue('Relates To')).toHaveLength(2)
  })

  it('adds a new link type row and saves it', async () => {
    mockLinkTypes()
    let sentBody: Record<string, unknown> | null = null
    server.use(
      http.put(url('/link-types'), async ({ request }) => {
        sentBody = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({
          success: true,
          data: [
            ...DEFAULT_TYPES,
            {
              id: 'depends-on',
              name: 'Depends On',
              inverseName: 'Is Depended On By',
              isBlocking: true,
            },
          ],
        })
      }),
    )
    const user = userEvent.setup()
    renderForm()

    await screen.findByDisplayValue('Blocks')
    await user.click(screen.getByRole('button', { name: /Add link type/ }))
    await user.type(screen.getByLabelText('Link type 3 name'), 'Depends On')
    await user.type(screen.getByLabelText('Link type 3 inverse name'), 'Is Depended On By')
    await user.click(screen.getByLabelText('Link type 3 is blocking'))
    await user.click(screen.getByRole('button', { name: 'Save link types' }))

    await waitFor(() => expect(sentBody).not.toBeNull())
    expect(sentBody!.linkTypes).toHaveLength(3)
    expect(await screen.findByText('Link types updated')).toBeInTheDocument()
  })

  it('removes a link type row', async () => {
    mockLinkTypes()
    const user = userEvent.setup()
    renderForm()

    await screen.findByDisplayValue('Blocks')
    await user.click(screen.getByLabelText('Remove link type Relates To'))

    expect(screen.queryByDisplayValue('Relates To')).not.toBeInTheDocument()
    expect(screen.getByDisplayValue('Blocks')).toBeInTheDocument()
  })

  it('disables Save when a name is blank or duplicated', async () => {
    mockLinkTypes()
    const user = userEvent.setup()
    renderForm()

    await screen.findByDisplayValue('Blocks')
    await user.click(screen.getByRole('button', { name: /Add link type/ }))
    await user.type(screen.getByLabelText('Link type 3 name'), 'Blocks')
    await user.type(screen.getByLabelText('Link type 3 inverse name'), 'Something')

    expect(screen.getByRole('button', { name: 'Save link types' })).toBeDisabled()
    expect(screen.getByText('Link type names must be unique.')).toBeInTheDocument()
  })
})
