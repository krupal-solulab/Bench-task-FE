import { ShieldAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/common/Button'

export function ForbiddenPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <ShieldAlert className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
      <h1 className="text-xl font-semibold">You don't have permission to view this page</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Your role doesn't grant access to this section. Contact an administrator if you believe this
        is a mistake.
      </p>
      <Button asChild>
        <Link to="/">Go home</Link>
      </Button>
    </div>
  )
}
