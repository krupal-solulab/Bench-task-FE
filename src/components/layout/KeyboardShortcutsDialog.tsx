import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { SHORTCUTS } from '@/lib/keyboard-shortcuts'

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

/** Module 11 gap-closure - the keyboard shortcut cheat-sheet, opened with "?" (never while the
 * user is typing in a field, so a literal "?" in a comment still works). */
export function KeyboardShortcutsDialog() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== '?' || e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return
      e.preventDefault()
      setOpen((prev) => !prev)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const groups = [...new Set(SHORTCUTS.map((s) => s.group))]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogTitle>Keyboard shortcuts</DialogTitle>
        <div className="space-y-4">
          {groups.map((group) => (
            <section key={group}>
              <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {group}
              </h3>
              <ul className="space-y-1.5">
                {SHORTCUTS.filter((s) => s.group === group).map((shortcut) => (
                  <li
                    key={`${group}-${shortcut.description}`}
                    className="flex items-center justify-between gap-4 text-sm"
                  >
                    <span>{shortcut.description}</span>
                    <span className="flex shrink-0 gap-1">
                      {shortcut.keys.map((key) => (
                        <kbd
                          key={key}
                          className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs"
                        >
                          {key}
                        </kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
