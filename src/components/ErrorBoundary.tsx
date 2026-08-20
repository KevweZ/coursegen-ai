import React, { Component, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Generic error boundary — wraps interactive components that may crash
 * (e.g. third-party BranchingScenario with invalid node data).
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] caught:', error, info);
  }

  handleReset = () => this.setState({ hasError: false, error: undefined });

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full flex flex-col items-center justify-center gap-4 p-8 rounded-xl border border-red-500/30 bg-red-500/10">
          <AlertCircle className="w-10 h-10 text-red-400" />
          <div className="text-center">
            <p className="text-red-300 font-bold text-base mb-1">
              {this.props.fallbackTitle ?? 'This component encountered an error'}
            </p>
            <p className="text-red-400/70 text-sm max-w-sm">
              {this.state.error?.message ?? 'An unexpected error occurred while rendering this interaction.'}
            </p>
          </div>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-sm font-semibold transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          <button
            type="button"
            onClick={() => {
              try {
                window.location.hash = '#/upload';
                window.location.reload();
              } catch {
                window.location.reload();
              }
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700/40 hover:bg-slate-700/60 text-slate-200 text-sm font-semibold transition-colors"
          >
            Reload app
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
