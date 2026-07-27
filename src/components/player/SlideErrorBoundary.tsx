/**
 * SlideErrorBoundary — catches render errors within a slide and shows a
 * friendly recovery UI. Prefer Regenerate (rebuild slide content) over a
 * bare retry that just remounts the same broken data.
 */
import React from 'react';
import { RefreshCw, RotateCcw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  slideId?: string;
  /** Rebuild the slide via AI when present (preferred CTA). */
  onRegenerate?: () => void | Promise<void>;
  regenerating?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class SlideErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.slideId !== this.props.slideId && this.state.hasError) {
      this.setState({ hasError: false, error: null });
    }
  }

  render() {
    if (this.state.hasError) {
      const canRegenerate = typeof this.props.onRegenerate === 'function';
      return (
        <div className="flex flex-col items-center justify-center min-h-[16rem] gap-4 p-8 rounded-2xl border border-red-500/30 bg-red-950/30 text-center">
          <p className="text-4xl">⚠️</p>
          <p className="text-red-300 font-bold text-lg">This slide encountered a rendering error.</p>
          <p className="text-slate-400 text-sm max-w-md">
            {this.state.error?.message || 'Unknown error'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {canRegenerate && (
              <button
                type="button"
                disabled={this.props.regenerating}
                onClick={async () => {
                  try {
                    await this.props.onRegenerate?.();
                    this.setState({ hasError: false, error: null });
                  } catch {
                    // keep error UI; regenerateBlankSlide surfaces its own failure path
                  }
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm font-semibold transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${this.props.regenerating ? 'animate-spin' : ''}`} />
                {this.props.regenerating ? 'Regenerating…' : 'Regenerate'}
              </button>
            )}
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, error: null })}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-600 hover:bg-slate-800 text-slate-300 text-sm font-semibold transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              {canRegenerate ? 'Try again' : 'Retry slide'}
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
