import React, { Component } from 'react';
import i18n from '../../i18n';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    if (error?.message?.includes('Timeout') || 
        error?.name === 'TimeoutError' ||
        error?.message === 'Timeout' ||
        (error?.stack && error?.stack.includes('recaptcha'))) {
      return null;
    }
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    if (error?.message?.includes('Timeout') || 
        error?.name === 'TimeoutError' ||
        error?.message === 'Timeout' ||
        (error?.stack && error?.stack.includes('recaptcha'))) {
      console.debug('[ErrorBoundary] Ignoring timeout error (non-critical):', error.message || error);
      return;
    }
    
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      const t = (key, defaultValue) => i18n.t(key, defaultValue);
      return (
        <div className="error-boundary">
          <h1>{t('common:error.somethingWentWrong', 'Something went wrong.')}</h1>
          <p>{t('common:error.applicationError', 'The application encountered an error. Please refresh the page or try again later.')}</p>
          {process.env.NODE_ENV === 'development' && (
            <details style={{ whiteSpace: 'pre-wrap' }}>
              {this.state.error && this.state.error.toString()}
              <br />
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </details>
          )}
          <button onClick={() => window.location.reload()}>{t('common:refreshPage', 'Refresh Page')}</button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 