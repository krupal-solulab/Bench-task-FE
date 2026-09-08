import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/common/Button'
import { FormField } from '@/components/common/FormField'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createUserSchema, type CreateUserFormValues } from '@/schemas/user.schema'
import { ORG_ROLES } from '@/types/user.types'

export function UserForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (values: CreateUserFormValues) => Promise<void>
  onCancel: () => void
}) {
  const {
    register,
    handleSubmit,
    setError,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { role: 'Developer' },
  })

  const role = watch('role')

  async function submit(values: CreateUserFormValues) {
    try {
      await onSubmit(values)
    } catch (err) {
      if (err instanceof Error && err.message === 'DUPLICATE_EMAIL') {
        setError('email', { message: 'An account with this email already exists' })
        return
      }
      throw err
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
      <FormField label="Name" htmlFor="name" error={errors.name?.message} required>
        <Input id="name" {...register('name')} />
      </FormField>

      <FormField label="Email" htmlFor="email" error={errors.email?.message} required>
        <Input id="email" type="email" {...register('email')} />
      </FormField>

      <FormField label="Password" htmlFor="password" error={errors.password?.message} required>
        <Input id="password" type="password" {...register('password')} />
      </FormField>

      <FormField label="Role" htmlFor="role" error={errors.role?.message} required>
        <Select
          value={role}
          onValueChange={(v) => setValue('role', v as CreateUserFormValues['role'])}
        >
          <SelectTrigger id="role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ORG_ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          Create user
        </Button>
      </div>
    </form>
  )
}
