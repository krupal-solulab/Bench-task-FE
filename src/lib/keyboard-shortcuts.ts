/** Module 11 gap-closure - every shortcut the app supports, shown by KeyboardShortcutsDialog.
 * Its own file (like nav-items.ts) so the dialog module stays component-only. */
const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
const MOD = isMac ? '⌘' : 'Ctrl'

export const SHORTCUTS: Array<{ group: string; keys: string[]; description: string }> = [
  {
    group: 'Anywhere',
    keys: [MOD, 'K'],
    description: 'Open the command palette (go to, search, actions)',
  },
  { group: 'Anywhere', keys: ['?'], description: 'Show this list of shortcuts' },
  { group: 'Anywhere', keys: ['Esc'], description: 'Close a dialog or the palette' },
  {
    group: 'Command palette',
    keys: ['↑', '↓'],
    description: 'Move through results',
  },
  { group: 'Command palette', keys: ['Enter'], description: 'Open the result or run the action' },
  {
    group: 'On an issue (via the palette)',
    keys: [MOD, 'K'],
    description: 'Assign to me, Watch, Move to the next status, Copy link',
  },
  { group: 'Comments', keys: [MOD, 'Enter'], description: 'Post the comment you are writing' },
  { group: 'Search box', keys: ['Enter'], description: 'See all search results' },
]
