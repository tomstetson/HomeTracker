/**
 * PageErrorBoundary - Granular error boundary for individual pages
 * 
 * Provides page-specific error handling with retry functionality
 * and better error recovery than the app-level boundary.
 */

import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronLeft } from 'lucide-react';
import { Button } from './ui/Button';

interface Props {
  children: ReactNode;
  pageName: string;
  onRetry?: () => void;
  showBackButton?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class PageErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Error in ${this.props.pageName}:`, error, errorInfo);
    this.setState({ errorInfo });
    
    // Store error for debugging
    try {
      const errorLog = {
        timestamp: new Date().toISOString(),
        page: this.props.pageName,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      };
      
      const existingLogs = JSON.parse(localStorage.getItem('hometracker_page_errors') || '[]');
      existingLogs.push(errorLog);
      
      // Keep only last 20 page errors
      if (existingLogs.length > 20) {
        existingLogs.shift();
      }
      
      localStorage.setItem('hometracker_page_errors', JSON.stringify(existingLogs));
    } catch {
      // Ignore localStorage errors
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    this.props.onRetry?.();
  };

  handleGoBack = () => {
    window.history.back();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-md w-full bg-card rounded-lg border shadow-lg p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            
            <h2 className="text-xl font-semibold text-foreground mb-2">
              {this.props.pageName} Error
            </h2>
            
            <p className="text-muted-foreground mb-6">
              Something went wrong loading this page. Your data is safe.
            </p>

            {/* Error details (collapsible) */}
            {this.state.error && (
              <details className="mb-6 text-left">
                <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
                  Technical details
                </summary>
                <div className="mt-2 p-3 bg-muted rounded text-xs font-mono overflow-auto max-h-32">
                  <p className="text-destructive font-semibold">
                    {this.state.error.message}
                  </p>
                  {this.state.error.stack && (
                    <pre className="mt-2 text-muted-foreground whitespace-pre-wrap">
                      {this.state.error.stack.split('\n').slice(0, 5).join('\n')}
                    </pre>
                  )}
                </div>
              </details>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={this.handleRetry}
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Button>
              
              {this.props.showBackButton && (
                <Button
                  onClick={this.handleGoBack}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Go Back
                </Button>
              )}
              
              <Button
                onClick={this.handleGoHome}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Home className="w-4 h-4" />
                Dashboard
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default PageErrorBoundary;
