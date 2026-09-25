import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { server } from '@/test/mocks/server'
import { CommentForm } from './CommentForm'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

function mockCannedResponses(responses: Array<Record<string, unknown>> = []) {
  server.use(
    http.get(url('/canned-responses'), () => HttpResponse.json({ success: true, data: responses })),
  )
}

function renderForm(onSubmit = vi.fn().mockResolvedValue(undefined)) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
  render(<CommentForm onSubmit={onSubmit} />, { wrapper: Wrapper })
  return { onSubmit }
}

describe('CommentForm (Role-surface polish additions)', () => {
  it('does not render a canned-response picker when the org has none (regression: existing plain form still works)', async () => {
    mockCannedResponses([])
    renderForm()

    expect(await screen.findByRole('button', { name: /AI Suggest/ })).toBeInTheDocument()
    expect(screen.queryByLabelText('Canned response')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Add a comment')).toBeInTheDocument()
  })

  it('renders the canned-response picker once the org has at least one (Radix Select popovers hang under jsdom, so selection itself is covered by live smoke testing, mirroring the precedent in SavedFiltersMenu.tsx)', async () => {
    mockCannedResponses([{ id: 'cr-1', title: 'Investigating', body: "We're looking into it." }])
    renderForm()

    expect(await screen.findByLabelText('Canned response')).toBeInTheDocument()
  })

  it('inserts a placeholder AI suggestion into the textarea on click', async () => {
    mockCannedResponses([])
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('button', { name: /AI Suggest/ }))

    await waitFor(() =>
      expect(
        (screen.getByLabelText('Add a comment') as HTMLTextAreaElement).value.length,
      ).toBeGreaterThan(0),
    )
  })

  describe('Module 7: @mention picker', () => {
    it('shows matching users once "@" plus a partial name is typed', async () => {
      mockCannedResponses([])
      const user = userEvent.setup()
      renderForm()

      await user.type(screen.getByLabelText('Add a comment'), 'Hey @Dev')

      expect(await screen.findByText('Dev One')).toBeInTheDocument()
      expect(await screen.findByText('Dev Two')).toBeInTheDocument()
      expect(screen.queryByText('Ada Admin')).not.toBeInTheDocument()
    })

    it('inserts @[Name](userId) markup and closes the picker on selection', async () => {
      mockCannedResponses([])
      const user = userEvent.setup()
      renderForm()

      const textarea = screen.getByLabelText('Add a comment') as HTMLTextAreaElement
      await user.type(textarea, 'Hey @Dev')
      await user.click(await screen.findByText('Dev One'))

      await waitFor(() => expect(textarea.value).toContain('@[Dev One](u-dev1)'))
      expect(screen.queryByText('Dev Two')).not.toBeInTheDocument()
    })

    it('closes the picker once whitespace follows the "@" (mention context ended)', async () => {
      mockCannedResponses([])
      const user = userEvent.setup()
      renderForm()

      await user.type(screen.getByLabelText('Add a comment'), 'Hey @Dev ')

      expect(screen.queryByText('Dev One')).not.toBeInTheDocument()
    })
  })
})
