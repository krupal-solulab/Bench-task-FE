import { screen, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { formatDayLabel } from '@/lib/date'

const MONTH_NAMES = Array.from({ length: 12 }, (_, m) =>
  new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(2000, m, 1)),
)

/** Picks 'YYYY-MM-DD' in a DatePicker through its calendar, the way a user would. */
export async function pickDate(user: UserEvent, trigger: HTMLElement, isoDate: string) {
  const [year, month, day] = isoDate.split('-').map(Number) as [number, number, number]
  await user.click(trigger)
  const calendar = await screen.findByRole('dialog')
  await user.click(within(calendar).getByRole('button', { name: 'Choose month and year' }))

  // Step the year view to the target year, then choose the month.
  for (let guard = 0; guard < 200; guard++) {
    const shown = Number(within(calendar).getByText(/^\d{4}$/).textContent)
    if (shown === year) break
    await user.click(
      within(calendar).getByRole('button', { name: shown < year ? 'Next year' : 'Previous year' }),
    )
  }
  await user.click(
    within(calendar).getByRole('button', { name: `${MONTH_NAMES[month - 1]} ${year}` }),
  )
  await user.click(
    within(calendar).getByRole('gridcell', {
      name: formatDayLabel(new Date(year, month - 1, day)),
    }),
  )
}
