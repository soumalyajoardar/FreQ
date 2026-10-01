import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

// Last-resort crash guard: a broken module (e.g. a stale HMR transform)
// shows a reload screen instead of a black app.
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('[FreQ] UI crash caught:', error);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            height: '100vh',
            width: '100vw',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            backgroundColor: '#090A0F',
            color: '#f8fafc',
            padding: '32px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '18px', fontWeight: 800 }}>Something glitched in FreQ</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '460px', lineHeight: 1.6 }}>
            {this.state.error.message || 'A view failed to render.'} Your library and queue are safe.
          </div>
          <button
            onClick={this.handleReload}
            style={{
              padding: '10px 26px',
              borderRadius: '999px',
              backgroundColor: '#f8fafc',
              color: '#090A0F',
              fontSize: '13px',
              fontWeight: 800,
            }}
          >
            Reload FreQ
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
