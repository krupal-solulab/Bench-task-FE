import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertOctagon } from 'lucide-react'
import { Button } from './Button'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled render error', error, info.componentStack)
  }

  handleReload = (): void => {
    window.location.reload()
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-muted/20 p-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertOctagon className="h-8 w-8 text-destructive" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p className="max-w-md text-sm text-muted-foreground">
            An unexpected error occurred while rendering this page. Reloading usually fixes it.
          </p>
          <Button onClick={this.handleReload}>Reload</Button>
        </div>
      )
    }

    return this.props.children
  }
}
