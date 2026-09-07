import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import type { ReactNode } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { ToastViewport } from '@/components/common/Toast'
import { AuthProvider } from '@/context/AuthContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { ToastProvider } from '@/context/ToastContext'
import { queryClient } from './query-client'

const DEVTOOLS_ENABLED = import.meta.env.VITE_ENABLE_DEVTOOLS === 'true'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              {children}
              <ToastViewport />
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </BrowserRouter>
      {DEVTOOLS_ENABLED && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  )
}
