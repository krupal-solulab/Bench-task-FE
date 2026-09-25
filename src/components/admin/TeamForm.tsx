import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { FormField } from '@/components/common/FormField'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { UserSelect } from '@/components/common/UserSelect'

import { useAssignableUsers } from '@/hooks/queries/useUsers'
import type { CreateTeamPayload } from '@/types/team.types'

export interface TeamFormProps {
  initialValues?: { name: string; description: string; leadId: string | null; memberIds: string[] }
  onSubmit: (values: CreateTeamPayload) => Promise<void>
  onCancel: () => void
  submitLabel: string
}

export function TeamForm({ initialValues, onSubmit, onCancel, submitLabel }: TeamFormProps) {
  const [name, setName] = useState(initialValues?.name ?? '')
  const [description, setDescription] = useState(initialValues?.description ?? '')
  const [leadId, setLeadId] = useState<string | null>(initialValues?.leadId ?? null)
  const [memberIds, setMemberIds] = useState<string[]>(initialValues?.memberIds ?? [])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { data: users } = useAssignableUsers()

  const userById = new Map((users?.data ?? []).map((u) => [u.id, u]))

  function addMember(userId: string | null) {
    if (!userId || memberIds.includes(userId)) return
    setMemberIds([...memberIds, userId])
  }

  function removeMember(userId: string) {
    setMemberIds(memberIds.filter((id) => id !== userId))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await onSubmit({ name: name.trim(), description: description.trim(), leadId, memberIds })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4" noValidate>
      <FormField label="Name" htmlFor="team-name" required>
        <Input
          id="team-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Backend Guild"
        />
      </FormField>

      <FormField label="Description" htmlFor="team-description">
        <Textarea
          id="team-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What this team owns"
        />
      </FormField>

      <FormField label="Lead" htmlFor="team-lead">
        <UserSelect
          id="team-lead"
          value={leadId}
          onChange={setLeadId}
          allowUnassigned
          placeholder="No lead"
        />
      </FormField>

      <div className="space-y-2">
        <p className="text-sm font-medium">Members</p>
        <div className="flex flex-wrap items-center gap-1.5">
          {memberIds.map((userId) => (
            <span
              key={userId}
              className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
            >
              {userById.get(userId)?.name ?? userId}
              <button
                type="button"
                onClick={() => removeMember(userId)}
                aria-label={`Remove ${userById.get(userId)?.name ?? userId}`}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <UserSelect
          value={null}
          onChange={addMember}
          allowUnassigned={false}
          placeholder="+ Add a member…"
        />
      </div>

      <div className="flex justify-end gap-2 border-t pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting} disabled={!name.trim()}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
