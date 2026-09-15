import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { TaskFilters, type TaskFiltersProps } from './TaskFilters'
import type { CustomFieldDefinition } from '@/types/project.types'

function renderFilters(props: TaskFiltersProps) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
  return render(<TaskFilters {...props} />, { wrapper: Wrapper })
}

const TEXT_FIELD: CustomFieldDefinition = {
  id: 'f-text',
  name: 'Root Cause',
  type: 'Text',
  required: false,
  options: null,
}
const DROPDOWN_FIELD: CustomFieldDefinition = {
  id: 'f-dropdown',
  name: 'Severity',
  type: 'Dropdown',
  required: false,
  options: ['Low', 'High'],
}

describe('TaskFilters', () => {
  it('renders no custom field filter controls when customFieldOptions is omitted (regression)', () => {
    renderFilters({ value: {}, onChange: vi.fn(), onClear: vi.fn() })
    expect(screen.queryByPlaceholderText('Root Cause')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Filter by Severity')).not.toBeInTheDocument()
  })

  it('renders a text input for a Text custom field and reports its value', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderFilters({
      value: {},
      onChange,
      onClear: vi.fn(),
      customFieldOptions: [TEXT_FIELD],
    })

    await user.type(screen.getByPlaceholderText('Root Cause'), 'x')

    expect(onChange).toHaveBeenLastCalledWith({
      customFieldFilters: [{ fieldId: 'f-text', value: 'x' }],
    })
  })

  it('renders a select for a Dropdown custom field, pre-filled from the current value', () => {
    renderFilters({
      value: { customFieldFilters: [{ fieldId: 'f-dropdown', value: 'High' }] },
      onChange: vi.fn(),
      onClear: vi.fn(),
      customFieldOptions: [DROPDOWN_FIELD],
    })

    expect(screen.getByLabelText('Filter by Severity')).toBeInTheDocument()
    expect(screen.getByText('High')).toBeInTheDocument()
  })

  it('clearing a custom field filter value removes it from customFieldFilters', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderFilters({
      value: { customFieldFilters: [{ fieldId: 'f-text', value: 'x' }] },
      onChange,
      onClear: vi.fn(),
      customFieldOptions: [TEXT_FIELD],
    })

    await user.clear(screen.getByDisplayValue('x'))

    expect(onChange).toHaveBeenLastCalledWith({ customFieldFilters: undefined })
  })

  it('treats an active custom field filter as an active filter (shows Clear)', () => {
    renderFilters({
      value: { customFieldFilters: [{ fieldId: 'f-text', value: 'x' }] },
      onChange: vi.fn(),
      onClear: vi.fn(),
      customFieldOptions: [TEXT_FIELD],
    })
    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument()
  })
})
