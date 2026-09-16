import { createContext, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { io, type Socket } from 'socket.io-client'
import { useQueryClient } from '@tanstack/react-query'
import { getAccessToken } from '@/services/api-client'
import { queryKeys } from '@/lib/constants'
import { useAuth } from '@/hooks/useAuth'

interface TaskStatusChangedEvent {
  taskId: string
  projectId: string
  fromStatus: string
  toStatus: string
  actorId: string
}

interface CommentCreatedEvent {
  taskId: string
  projectId: string
  commentId: string
  authorId: string
}

interface NotificationCreatedEvent {
  recipientId: string
  notificationId: string
}

export interface SocketContextValue {
  /** Joins the room for a project's real-time events; safe to call before the socket connects. */
  joinProject: (projectId: string) => void
  leaveProject: (projectId: string) => void
}

export const SocketContext = createContext<SocketContextValue | undefined>(undefined)

/** The API base URL includes the `/api/v1` REST prefix - Socket.IO connects to the bare origin. */
function getSocketBaseUrl(): string {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL as string
  try {
    return new URL(apiBaseUrl).origin
  } catch {
    return apiBaseUrl
  }
}

export function SocketProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const queryClient = useQueryClient()
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!isAuthenticated) {
      socketRef.current?.disconnect()
      socketRef.current = null
      return
    }

    // `auth` as a function (rather than a plain object) is re-invoked on every connection
    // attempt, including Socket.IO's automatic reconnects - so a token rotated in the meantime
    // by the Axios refresh flow (see api-client.ts) is always picked up without this provider
    // needing to know when that rotation happened.
    const socket = io(getSocketBaseUrl(), {
      auth: (cb) => cb({ token: getAccessToken() }),
      transports: ['websocket'],
    })
    socketRef.current = socket

    socket.on('task:statusChanged', (event: TaskStatusChangedEvent) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(event.taskId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(event.projectId) })
    })

    socket.on('comment:created', (event: CommentCreatedEvent) => {
      void queryClient.invalidateQueries({ queryKey: ['comments', event.taskId] })
    })

    // The event only carries ids as a cache-invalidation signal - the bell refetches the list and
    // unread count rather than trusting any content off the socket.
    socket.on('notification:created', (_event: NotificationCreatedEvent) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all })
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [isAuthenticated, queryClient])

  const value = useMemo<SocketContextValue>(
    () => ({
      joinProject: (projectId: string) => socketRef.current?.emit('join:project', projectId),
      leaveProject: (projectId: string) => socketRef.current?.emit('leave:project', projectId),
    }),
    [],
  )

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
}
