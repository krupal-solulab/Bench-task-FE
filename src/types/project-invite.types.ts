import type { ProjectMemberRole } from './user.types'

export type ProjectInviteStatus = 'Pending' | 'Accepted' | 'Revoked' | 'Expired'

export interface ProjectInvite {
  id: string
  projectId: string
  email: string
  /** Null for every new invite - the invitee enters their own name when they first sign in. */
  name: string | null
  role: ProjectMemberRole
  status: ProjectInviteStatus
  expiresAt: string
  invitedBy: { id: string; name: string } | null
  resendCount: number
  lastSentAt: string | null
  acceptedAt: string | null
  revokedAt: string | null
  createdAt: string
}

export interface CreateProjectInvitePayload {
  email: string
  role: ProjectMemberRole
}

/** Only returned when an invite is sent or resent - the one time the secrets are visible. */
export interface SentProjectInvite {
  invite: ProjectInvite
  inviteUrl: string
  temporaryPassword: string
  emailSent: boolean
}

/** What the public invitation page shows before signing in. */
export interface ProjectInvitePreview {
  status: ProjectInviteStatus
  email: string
  role: ProjectMemberRole
  projectName: string
  organizationName: string | null
  inviterName: string | null
  expiresAt: string
}
