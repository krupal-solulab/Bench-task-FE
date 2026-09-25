import { useState } from 'react'
import { Pencil, Plus, Trash2, Users } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/common/Button'
import { Modal } from '@/components/common/Modal'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { Avatar } from '@/components/common/Avatar'
import { TeamForm } from '@/components/admin/TeamForm'
import { useTeams } from '@/hooks/queries/useTeams'
import { useCreateTeam, useDeleteTeam, useUpdateTeam } from '@/hooks/mutations/useTeamMutations'
import { useToast } from '@/hooks/useToast'
import { toApiError } from '@/lib/error'
import type { CreateTeamPayload, Team } from '@/types/team.types'

export function TeamsPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Team | null>(null)
  const [deleting, setDeleting] = useState<Team | null>(null)

  const { data: teams, isLoading } = useTeams()
  const createTeam = useCreateTeam()
  const updateTeam = useUpdateTeam(editing?.id ?? '')
  const deleteTeam = useDeleteTeam()
  const { showToast } = useToast()

  async function handleCreate(values: CreateTeamPayload) {
    try {
      await createTeam.mutateAsync(values)
      showToast({ title: 'Team created', variant: 'success' })
      setCreateOpen(false)
    } catch (err) {
      showToast({
        title: 'Could not create team',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  async function handleUpdate(values: CreateTeamPayload) {
    try {
      await updateTeam.mutateAsync(values)
      showToast({ title: 'Team updated', variant: 'success' })
      setEditing(null)
    } catch (err) {
      showToast({
        title: 'Could not update team',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  async function handleDelete() {
    if (!deleting) return
    try {
      await deleteTeam.mutateAsync(deleting.id)
      showToast({ title: 'Team deleted', variant: 'success' })
    } catch (err) {
      showToast({
        title: 'Could not delete team',
        description: toApiError(err).message,
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Teams"
        description="Group users into teams - reference a team from a Permission/Security Scheme grant or a project's Role Assignments"
        actions={
          <Button onClick={() => setCreateOpen(true)} className="gap-1">
            <Plus className="h-4 w-4" /> New team
          </Button>
        }
      />

      {!isLoading && (teams ?? []).length === 0 && (
        <EmptyState
          icon={Users}
          title="No teams yet"
          description="Create a team to group users for scheme grants and project role assignments."
          actionLabel="New team"
          onAction={() => setCreateOpen(true)}
        />
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(teams ?? []).map((team) => (
          <div key={team.id} className="space-y-2 rounded-lg border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{team.name}</p>
                {team.description && (
                  <p className="text-xs text-muted-foreground">{team.description}</p>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setEditing(team)}
                  aria-label={`Edit ${team.name}`}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleting(team)}
                  aria-label={`Delete ${team.name}`}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            {team.leadId && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Avatar name={team.leadId.name} size="sm" /> Lead: {team.leadId.name}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {team.memberIds.length} member{team.memberIds.length === 1 ? '' : 's'}
            </p>
          </div>
        ))}
      </div>

      <Modal open={createOpen} onOpenChange={setCreateOpen} title="New team" size="lg">
        <TeamForm
          onSubmit={handleCreate}
          onCancel={() => setCreateOpen(false)}
          submitLabel="Create team"
        />
      </Modal>

      <Modal
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
        title={`Edit "${editing?.name ?? ''}"`}
        size="lg"
      >
        {editing && (
          <TeamForm
            initialValues={{
              name: editing.name,
              description: editing.description,
              leadId: editing.leadId?.id ?? null,
              memberIds: editing.memberIds.map((u) => u.id),
            }}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(null)}
            submitLabel="Save changes"
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete team"
        description={`Delete "${deleting?.name ?? ''}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
