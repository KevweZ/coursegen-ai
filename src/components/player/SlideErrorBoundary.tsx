/**
 * SlideErrorBoundary — catches render errors within a slide and shows a
 * friendly recovery UI instead of a full white screen crash.
 */
import React from 'react';

interface State { hasError: boolean; error: Error | null; }

export class SlideErrorBoundary extends React.Component<
  { children: React.ReactNode; slideId?: string },
  State
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidUpdate(prevProps: any) {
    // Reset when the slide changes
    if (prevProps.slideId !== this.props.slideId && this.state.hasError) {
      this.setState({ hasError: false, error: null });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-64 gap-4 p-8 rounded-2xl border border-red-500/30 bg-red-950/30 text-center">
          <p className="text-4xl">⚠️</p>
          <p className="text-red-300 font-bold text-lg">This slide encountered a rendering error.</p>
          <p className="text-slate-400 text-sm max-w-md">
            {this.state.error?.message || 'Unknown error'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors"
          >
            Retry slide
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
