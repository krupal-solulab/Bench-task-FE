import { LogOut, Moon, Sun, User as UserIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Avatar } from '@/components/common/Avatar'
import { Button } from '@/components/common/Button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { useToast } from '@/hooks/useToast'
import { APP_NAME } from '@/lib/constants'

export function Topbar() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { showToast } = useToast()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    showToast({ title: 'Signed out', variant: 'default' })
    navigate('/login', { replace: true })
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-card/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <span className="flex items-center gap-2 font-semibold tracking-tight">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
          {APP_NAME.charAt(0)}
        </span>
        {APP_NAME}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded-full p-0.5 ring-offset-background transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Open user menu"
            >
              <Avatar name={user?.name ?? ''} size="sm" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              <p className="truncate">{user?.name}</p>
              <p className="truncate text-xs font-normal text-muted-foreground">{user?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => navigate('/profile')}>
              <UserIcon className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
