import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { AuthContext, type AuthContextValue } from '@/context/AuthContext'
import { ToastProvider } from '@/context/ToastContext'
import { mockUsers } from '@/test/mocks/fixtures'
import { CommentItem } from '@/components/comments/CommentItem'
import type { Comment } from '@/types/comment.types'

const AUTHOR = mockUsers[2]! // Dev One
const OTHER_DEV = mockUsers[3]! // Dev Two
const ADMIN = mockUsers[0]! // Ada Admin

function makeComment(overrides: Partial<Comment> = {}): Comment {
  return {
    id: 'c-1',
    taskId: 't-1',
    body: 'Original body',
    author: AUTHOR,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

function makeAuthValue(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    user: AUTHOR,
    isAuthenticated: true,
    isLoading: false,
    login: async () => {},
    registerOrganization: async () => {},
    logout: async () => {},
    hasRole: () => false,
    ...overrides,
  }
}

function renderComment(comment: Comment, authValue: AuthContextValue) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>
        </ToastProvider>
      </QueryClientProvider>
    )
  }
  return render(<CommentItem comment={comment} taskId="t-1" />, { wrapper: Wrapper })
}

describe('CommentItem', () => {
  it('shows Edit and Delete for the comment author', () => {
    renderComment(makeComment(), makeAuthValue({ user: AUTHOR }))
    expect(screen.getByText('Edit')).toBeInTheDocument()
    expect(screen.getByText('Delete')).toBeInTheDocument()
  })

  it("shows Edit and Delete for an Admin viewing someone else's comment", () => {
    renderComment(
      makeComment({ author: AUTHOR }),
      makeAuthValue({ user: ADMIN, hasRole: (...roles) => roles.includes('Admin') }),
    )
    expect(screen.getByText('Edit')).toBeInTheDocument()
    expect(screen.getByText('Delete')).toBeInTheDocument()
  })

  it('hides Edit and Delete for a non-author, non-admin viewer', () => {
    renderComment(makeComment({ author: AUTHOR }), makeAuthValue({ user: OTHER_DEV }))
    expect(screen.queryByText('Edit')).not.toBeInTheDocument()
    expect(screen.queryByText('Delete')).not.toBeInTheDocument()
  })

  it('hides actions entirely on an optimistic (not-yet-saved) comment, even for its author', () => {
    renderComment(makeComment({ id: 'temp-12345' }), makeAuthValue({ user: AUTHOR }))
    expect(screen.queryByText('Edit')).not.toBeInTheDocument()
    expect(screen.queryByText('Delete')).not.toBeInTheDocument()
    expect(screen.getByText('Sending…')).toBeInTheDocument()
  })

  it('renders the comment body and author name', () => {
    renderComment(makeComment({ body: 'hello there' }), makeAuthValue({ user: AUTHOR }))
    expect(screen.getByText('hello there')).toBeInTheDocument()
    expect(screen.getByText(AUTHOR.name)).toBeInTheDocument()
  })
})
