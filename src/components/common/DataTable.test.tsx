import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DataTable, type DataTableColumn } from './DataTable'

interface Row {
  id: string
  name: string
}

const columns: DataTableColumn<Row>[] = [{ key: 'name', header: 'Name', render: (row) => row.name }]

describe('DataTable', () => {
  it('renders a loading skeleton while isLoading is true', () => {
    render(<DataTable columns={columns} data={[]} getRowKey={(r) => r.id} isLoading />)
    expect(screen.getByTestId('table-skeleton')).toBeInTheDocument()
  })

  it('renders an error state with a working Retry button', async () => {
    const onRetry = vi.fn()
    render(
      <DataTable
        columns={columns}
        data={[]}
        getRowKey={(r) => r.id}
        isError
        errorMessage="Boom"
        onRetry={onRetry}
      />,
    )
    expect(screen.getByText('Boom')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('renders the empty state when data is empty', () => {
    render(
      <DataTable
        columns={columns}
        data={[]}
        getRowKey={(r) => r.id}
        emptyState={<p>Nothing here</p>}
      />,
    )
    expect(screen.getByText('Nothing here')).toBeInTheDocument()
  })

  it('renders rows when data is present', () => {
    render(
      <DataTable columns={columns} data={[{ id: '1', name: 'Alpha' }]} getRowKey={(r) => r.id} />,
    )
    expect(screen.getByText('Alpha')).toBeInTheDocument()
  })
})
