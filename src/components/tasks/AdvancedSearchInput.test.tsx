import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { server } from '@/test/mocks/server'
import { AdvancedSearchInput } from './AdvancedSearchInput'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`

function mockAutocompleteFields() {
  server.use(
    http.get(url('/tasks/search/autocomplete-fields'), () =>
      HttpResponse.json({
        success: true,
        data: {
          fields: [
            {
              field: 'priority',
              label: 'Priority',
              operators: ['=', '!='],
              valueType: 'enum',
              hasDynamicValues: false,
            },
            {
              field: 'status',
              label: 'Status',
              operators: ['=', '!='],
              valueType: 'text',
              hasDynamicValues: true,
            },
          ],
          keywords: ['AND', 'OR'],
        },
      }),
    ),
  )
}

function mockAutocompleteValues(values: string[]) {
  server.use(
    http.get(url('/tasks/search/autocomplete-values'), () =>
      HttpResponse.json({ success: true, data: values }),
    ),
  )
}

function renderInput(props: Partial<Parameters<typeof AdvancedSearchInput>[0]> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
  return render(
    <AdvancedSearchInput activeQuery={null} onSearch={vi.fn()} onClear={vi.fn()} {...props} />,
    { wrapper: Wrapper },
  )
}

describe('AdvancedSearchInput', () => {
  it('disables Search until a query is typed', () => {
    renderInput()
    expect(screen.getByRole('button', { name: /Search/ })).toBeDisabled()
  })

  it('calls onSearch with the trimmed query on submit', async () => {
    const onSearch = vi.fn()
    const user = userEvent.setup()
    renderInput({ onSearch })

    await user.type(screen.getByLabelText('Advanced search'), '  status = Done  ')
    await user.click(screen.getByRole('button', { name: /Search/ }))

    expect(onSearch).toHaveBeenCalledWith('status = Done')
  })

  it('shows no Clear button until a query is active', () => {
    renderInput()
    expect(screen.queryByRole('button', { name: /Clear/ })).not.toBeInTheDocument()
  })

  it('shows Clear once a query is active, and calls onClear', async () => {
    const onClear = vi.fn()
    const user = userEvent.setup()
    renderInput({ activeQuery: 'status = Done', onClear })

    await user.click(screen.getByRole('button', { name: /Clear/ }))
    expect(onClear).toHaveBeenCalledTimes(1)
  })

  it('shows a validation error when given one', () => {
    renderInput({ activeQuery: 'bogus = 1', error: 'Unknown field "bogus"' })
    expect(screen.getByRole('alert')).toHaveTextContent('Unknown field "bogus"')
  })

  describe('autocomplete (Module 4)', () => {
    it('suggests field names at the start of a query', async () => {
      mockAutocompleteFields()
      renderInput()

      expect(await screen.findByText('priority')).toBeInTheDocument()
      expect(screen.getByText('status')).toBeInTheDocument()
    })

    it('clicking a field suggestion inserts it into the textarea', async () => {
      mockAutocompleteFields()
      const user = userEvent.setup()
      renderInput()

      await user.click(await screen.findByText('priority'))

      expect(screen.getByLabelText('Advanced search')).toHaveValue('priority ')
    })

    it('suggests operators once a known field is typed', async () => {
      mockAutocompleteFields()
      const user = userEvent.setup()
      renderInput()

      await user.type(screen.getByLabelText('Advanced search'), 'priority ')

      expect(await screen.findByText('=')).toBeInTheDocument()
      expect(screen.getByText('!=')).toBeInTheDocument()
    })

    it('suggests dynamic values for a field once its operator is typed', async () => {
      mockAutocompleteFields()
      mockAutocompleteValues(['Todo', 'Done'])
      const user = userEvent.setup()
      renderInput()

      await user.type(screen.getByLabelText('Advanced search'), 'status = ')

      expect(await screen.findByText('Todo')).toBeInTheDocument()
      expect(screen.getByText('Done')).toBeInTheDocument()
    })
  })
})
