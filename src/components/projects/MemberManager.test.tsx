import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { ToastViewport } from '@/components/common/Toast'
import { MemberManager } from '@/components/projects/MemberManager'
import { mockProjects } from '@/test/mocks/fixtures'
import { server } from '@/test/mocks/server'
import { renderWithProviders, screen, waitFor, within } from '@/test/utils/render'
import type { ProjectInvite, SentProjectInvite } from '@/types/project-invite.types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const url = (path: string) => `${BASE_URL}${path}`
const project = mockProjects[0]!

function makeInvite(overrides: Partial<ProjectInvite> = {}): ProjectInvite {
  return {
    id: 'inv-1',
    projectId: project.id,
    email: 'asha@example.com',
    name: null,
    role: 'Developer',
    status: 'Pending',
    expiresAt: new Date(Date.now() + 6 * 86_400_000).toISOString(),
    invitedBy: { id: 'u-manager', name: 'Max Manager' },
    resendCount: 0,
    lastSentAt: null,
    acceptedAt: null,
    revokedAt: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

function sent(overrides: Partial<SentProjectInvite> = {}): SentProjectInvite {
  return {
    invite: makeInvite(),
    inviteUrl: 'http://localhost:5173/invite/tok_abcdefghijklmnopqrstuvwxyz0123456789ABCDE',
    temporaryPassword: 'Tmp4wordXyz9',
    emailSent: true,
    ...overrides,
  }
}

function renderManager() {
  return renderWithProviders(
    <>
      <MemberManager project={project} canManage />
      <ToastViewport />
    </>,
  )
}

describe('MemberManager invitations', () => {
  it('invites a new person by email and shows the link + temporary password once', async () => {
    let body: unknown
    server.use(
      http.post(url(`/projects/${project.id}/invites`), async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ success: true, data: sent() }, { status: 201 })
      }),
    )
    const user = userEvent.setup()
    renderManager()

    await user.click(screen.getByRole('button', { name: /add member/i }))
    await user.click(screen.getByRole('tab', { name: 'Invite by email' }))
    // The owner gives neither a name nor a password - the invitee enters their own name later.
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/full name/i)).not.toBeInTheDocument()
    await user.type(screen.getByLabelText(/^email/i), 'asha@example.com')
    await user.click(screen.getByRole('button', { name: 'Send invitation' }))

    const dialog = await screen.findByRole('dialog', { name: 'Invitation sent' })
    expect(body).toEqual({ email: 'asha@example.com', role: 'Developer' })
    expect(within(dialog).getByText(/Invitation emailed to asha@example.com/)).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Invitation link')).toHaveValue(sent().inviteUrl)
    const password = within(dialog).getByLabelText('Temporary password')
    expect(password).toHaveValue('Tmp4wordXyz9')
    expect(password).toHaveAttribute('type', 'password')
    await user.click(within(dialog).getByRole('button', { name: 'Show temporary password' }))
    expect(password).toHaveAttribute('type', 'text')
  })

  it('tells the inviter to share the details themselves when the email could not be sent', async () => {
    server.use(
      http.post(url(`/projects/${project.id}/invites`), () =>
        HttpResponse.json({ success: true, data: sent({ emailSent: false }) }, { status: 201 }),
      ),
    )
    const user = userEvent.setup()
    renderManager()

    await user.click(screen.getByRole('button', { name: /add member/i }))
    await user.click(screen.getByRole('tab', { name: 'Invite by email' }))
    await user.type(screen.getByLabelText(/^email/i), 'asha@example.com')
    await user.click(screen.getByRole('button', { name: 'Send invitation' }))

    expect(await screen.findByText(/could not be sent/)).toBeInTheDocument()
  })

  it('validates the invite form before sending', async () => {
    const user = userEvent.setup()
    renderManager()

    await user.click(screen.getByRole('button', { name: /add member/i }))
    await user.click(screen.getByRole('tab', { name: 'Invite by email' }))
    await user.type(screen.getByLabelText(/^email/i), 'not-an-email')
    await user.click(screen.getByRole('button', { name: 'Send invitation' }))

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument()
  })

  it('lists pending and expired invitations; resend shows fresh details, revoke confirms', async () => {
    let revokedId: string | undefined
    server.use(
      http.get(url(`/projects/${project.id}/invites`), () =>
        HttpResponse.json({
          success: true,
          data: [
            makeInvite(),
            makeInvite({
              id: 'inv-2',
              email: 'late@example.com',
              status: 'Expired',
              expiresAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
            }),
            makeInvite({ id: 'inv-3', email: 'gone@example.com', status: 'Revoked' }),
          ],
        }),
      ),
      http.post(url(`/projects/${project.id}/invites/inv-2/resend`), () =>
        HttpResponse.json({
          success: true,
          data: sent({ invite: makeInvite({ id: 'inv-2', resendCount: 1 }) }),
        }),
      ),
      http.delete(url(`/projects/${project.id}/invites/:inviteId`), ({ params }) => {
        revokedId = params.inviteId as string
        return HttpResponse.json({ success: true, data: makeInvite({ status: 'Revoked' }) })
      }),
    )
    const user = userEvent.setup()
    renderManager()

    expect(await screen.findByText('Pending invitations (2)')).toBeInTheDocument()
    expect(screen.queryByText(/gone@example.com/)).not.toBeInTheDocument()
    expect(screen.getByText(/Expires in 6 days/)).toBeInTheDocument()
    expect(screen.getByText(/Expired 2 days ago/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Resend invitation to late@example.com' }))
    const dialog = await screen.findByRole('dialog', { name: 'Invitation resent' })
    expect(within(dialog).getByLabelText('Temporary password')).toHaveValue('Tmp4wordXyz9')
    await user.click(within(dialog).getByRole('button', { name: 'Done' }))

    await user.click(screen.getByRole('button', { name: 'Revoke invitation to asha@example.com' }))
    await user.click(await screen.findByRole('button', { name: 'Revoke' }))
    await waitFor(() => expect(revokedId).toBe('inv-1'))
  })

  it('adds an existing user picked from the candidates (people not yet in the project)', async () => {
    let addedIds: unknown
    server.use(
      http.post(url(`/projects/${project.id}/members`), async ({ request }) => {
        addedIds = ((await request.json()) as { userIds: string[] }).userIds
        return HttpResponse.json({ success: true, data: project }, { status: 201 })
      }),
    )
    const user = userEvent.setup()
    renderManager()

    await user.click(screen.getByRole('button', { name: /add member/i }))
    const trigger = await screen.findByRole('combobox', { name: 'User' })
    await waitFor(() => expect(trigger).toBeEnabled())
    await user.click(trigger)
    const option = (await screen.findAllByRole('option'))[0]!
    await user.click(option)
    await user.click(screen.getByRole('button', { name: 'Add' }))

    await waitFor(() => expect(addedIds).toHaveLength(1))
  })
})
