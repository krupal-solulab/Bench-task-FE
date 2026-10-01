import { useContext, useState } from 'react'
import { Eye } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { AuthContext } from '@/context/AuthContext'

/** Module 8 gap-closure - always-visible while an Admin is viewing as someone (read-only). Reads
 * the context optionally so layouts rendered without an AuthProvider (tests) are unaffected. */
export function ImpersonationBanner() {
  const auth = useContext(AuthContext)
  const [exiting, setExiting] = useState(false)
  if (!auth?.impersonation || !auth.user) return null

  async function exit() {
    setExiting(true)
    await auth?.stopImpersonation?.()
  }

  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-center gap-3 bg-amber-500 px-4 py-2 text-sm font-medium text-amber-950"
    >
      <Eye className="h-4 w-4" aria-hidden="true" />
      <span>
        Viewing as {auth.user.name} ({auth.user.role}) — read-only. Signed in as{' '}
        {auth.impersonation.impersonator.name}.
      </span>
      <Button size="sm" variant="outline" onClick={() => void exit()} loading={exiting}>
        Exit view as
      </Button>
    </div>
  )
}
