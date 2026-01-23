import React from 'react';

class CalendarErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    
    this.setState({
      error: error,
      errorInfo: errorInfo,
      hasError: true
    });

    // Send error to logging service
    this.logErrorToService(error, errorInfo);
  }

  logErrorToService = (error, errorInfo) => {
    // In a real application, you would send this to your error reporting service
    const errorReport = {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      errorInfo: {
        componentStack: errorInfo.componentStack
      },
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: this.props.userId || 'unknown'
    };

    
    // Example: Send to error reporting service
    // errorReportingService.captureException(error, errorReport);
  };

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));

    // If this is a repeated error, reload the page
    if (this.state.retryCount >= 2) {
      window.location.reload();
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="calendar-error-boundary">
          <div className="error-container">
            <div className="error-icon">
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            
            <h2>Something went wrong with the calendar</h2>
            
            <p>
              The calendar encountered an unexpected error. Don't worry - your data is safe.
              You can try refreshing the page or contact support if the problem persists.
            </p>

            <div className="error-actions">
              <button 
                className="retry-button primary"
                onClick={this.handleRetry}
              >
                Try Again
              </button>
              
              <button 
                className="reload-button secondary"
                onClick={this.handleReload}
              >
                Reload Page
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && (
              <details className="error-details">
                <summary>Error Details (Development)</summary>
                <div className="error-info">
                  <h4>Error:</h4>
                  <pre>{this.state.error && this.state.error.toString()}</pre>
                  
                  <h4>Component Stack:</h4>
                  <pre>{this.state.errorInfo.componentStack}</pre>
                  
                  <h4>Error Stack:</h4>
                  <pre>{this.state.error && this.state.error.stack}</pre>
                </div>
              </details>
            )}
          </div>

          <style jsx>{`
            .calendar-error-boundary {
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 400px;
              padding: 2rem;
              background: #f9f9f9;
              border-radius: 8px;
              margin: 1rem;
            }

            .error-container {
              text-align: center;
              max-width: 500px;
            }

            .error-icon {
              color: #dc3545;
              margin-bottom: 1rem;
            }

            .error-icon svg {
              width: 64px;
              height: 64px;
            }

            h2 {
              color: #333;
              margin-bottom: 1rem;
              font-size: 1.5rem;
            }

            p {
              color: #666;
              margin-bottom: 2rem;
              line-height: 1.5;
            }

            .error-actions {
              display: flex;
              gap: 1rem;
              justify-content: center;
              flex-wrap: wrap;
            }

            .retry-button,
            .reload-button {
              padding: 0.75rem 1.5rem;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              font-size: 1rem;
              transition: background-color 0.2s;
            }

            .primary {
              background-color: #007bff;
              color: white;
            }

            .primary:hover {
              background-color: #0056b3;
            }

            .secondary {
              background-color: #6c757d;
              color: white;
            }

            .secondary:hover {
              background-color: #5a6268;
            }

            .error-details {
              margin-top: 2rem;
              text-align: left;
              background: #f8f9fa;
              border: 1px solid #dee2e6;
              border-radius: 4px;
              padding: 1rem;
            }

            .error-details summary {
              cursor: pointer;
              font-weight: bold;
              margin-bottom: 1rem;
            }

            .error-info h4 {
              margin: 1rem 0 0.5rem 0;
              color: #495057;
            }

            .error-info pre {
              background: #e9ecef;
              padding: 0.5rem;
              border-radius: 4px;
              overflow-x: auto;
              font-size: 0.875rem;
              white-space: pre-wrap;
              word-break: break-word;
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}

export default CalendarErrorBoundary; 