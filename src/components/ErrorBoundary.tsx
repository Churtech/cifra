import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // We would send this to Sentry or another monitoring system here
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 border border-red-500 bg-red-50 rounded-md text-red-700 w-full flex flex-col items-center justify-center my-4">
          <h2 className="text-lg font-semibold mb-2">Something went wrong.</h2>
          <p className="text-sm mb-4">
            {this.props.fallbackMessage || 'Failed to load data. No default data is shown to prevent financial inaccuracies.'}
          </p>
          <button
            onClick={this.handleRetry}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
