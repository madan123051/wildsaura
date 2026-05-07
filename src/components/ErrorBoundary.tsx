import React from 'react';

type ErrorBoundaryState = {
  hasError: boolean;
  errorMessage?: string;
};

export class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Unhandled UI error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', background: 'var(--wa-dark)', color: 'var(--wa-text)', display: 'grid', placeItems: 'center', padding: '2rem' }}>
          <div style={{ maxWidth: 640, textAlign: 'center' }}>
            <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Something went wrong</h1>
            <p style={{ opacity: 0.9, lineHeight: 1.6 }}>
              The app hit an unexpected error. Try reloading this page.
            </p>
            {this.state.errorMessage && (
              <p style={{ marginTop: '1rem', opacity: 0.75, fontFamily: 'monospace' }}>{this.state.errorMessage}</p>
            )}
            <button onClick={this.handleReload} className="btn-gold" style={{ marginTop: '1.5rem' }}>
              Reload Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
