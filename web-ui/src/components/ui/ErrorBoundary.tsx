import { Component, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from './button'
import { useI18n } from '@/i18n/useI18n'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

// Wrapper to provide translations to the error UI
function ErrorUI({
  error,
  errorInfo,
  onRetry,
  onGoHome
}: {
  error: Error | null
  errorInfo: React.ErrorInfo | null
  onRetry: () => void
  onGoHome: () => void
}) {
  const { t } = useI18n()

  return (
    <div className="min-h-[400px] flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="h-8 w-8 text-red-500" />
        </div>

        <h2 className="text-xl font-bold mb-2">{t('error.title')}</h2>
        <p className="text-muted-foreground mb-6">
          {t('error.description')}
        </p>

        {/* Error details (collapsible in production) */}
        {process.env.NODE_ENV === 'development' && error && (
          <details className="text-left mb-6 p-4 rounded-lg bg-muted text-xs">
            <summary className="cursor-pointer font-medium mb-2">
              {t('error.details')}
            </summary>
            <pre className="overflow-x-auto whitespace-pre-wrap text-red-500">
              {error.message}
            </pre>
            {errorInfo && (
              <pre className="overflow-x-auto whitespace-pre-wrap mt-2 text-muted-foreground">
                {errorInfo.componentStack}
              </pre>
            )}
          </details>
        )}

        <div className="flex justify-center gap-3">
          <Button variant="outline" onClick={onGoHome}>
            <Home className="h-4 w-4 mr-2" />
            {t('error.goHome')}
          </Button>
          <Button onClick={onRetry}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('error.tryAgain')}
          </Button>
        </div>
      </div>
    </div>
  )
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo })

    // Log error to console
    console.error('ErrorBoundary caught an error:', error, errorInfo)

    // Call optional error handler
    this.props.onError?.(error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI with translations
      return (
        <ErrorUI
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onRetry={this.handleRetry}
          onGoHome={this.handleGoHome}
        />
      )
    }

    return this.props.children
  }
}

// Hook for functional components to catch errors
export function useErrorHandler() {
  return (error: Error) => {
    console.error('useErrorHandler:', error)
    // Could integrate with error tracking service here
  }
}

// Higher-order component version
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WithErrorBoundaryWrapper(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    )
  }
}
