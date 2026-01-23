import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import './i18n';
import reportWebVitals from './reportWebVitals';


const isRecaptchaTimeout = (error) => {
  if (!error) return false;
  const message = error.message || (typeof error === 'string' ? error : String(error));
  const stack = error.stack || (error instanceof Error ? error.stack : '');

  return (
    error.isTimeout === true ||
    error.name === 'TimeoutError' ||
    message.includes('Timeout') ||
    message === 'Timeout' ||
    message.includes('timeout') ||
    /Timeout\s*\([a-z]\)/i.test(message) ||
    (stack && (stack.includes('recaptcha') || stack.includes('grecaptcha')))
  );
};

const handleUnhandledRejection = (event) => {
  if (isRecaptchaTimeout(event.reason)) {
    console.debug('[Global] Suppressed timeout unhandled rejection:', event.reason);
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }
};

const handleError = (event) => {
  if (event.error && isRecaptchaTimeout(event.error)) {
    console.debug('[Global] Suppressed timeout error:', event.error);
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }
  if (event.message && (event.message.includes('Timeout') || /Timeout\s*\([a-z]\)/i.test(event.message))) {
    console.debug('[Global] Suppressed timeout message:', event.message);
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }
};

const timeoutSuppressionPriority = () => {
  window.addEventListener('unhandledrejection', handleUnhandledRejection, true);
  window.addEventListener('error', handleError, true);
  
  setTimeout(() => {
    window.addEventListener('unhandledrejection', handleUnhandledRejection, true);
    window.addEventListener('error', handleError, true);
  }, 0);
};

timeoutSuppressionPriority();

const originalConsoleError = console.error;
console.error = (...args) => {
  const firstArg = args[0];
  if (firstArg) {
    const argStr = String(firstArg);
    if (argStr.includes('Timeout') || /Timeout\s*\([a-z]\)/i.test(argStr)) {
      console.debug('[Global] Suppressed console.error for Timeout:', ...args);
      return;
    }
    if (argStr.includes('[i18n]') || 
        argStr.includes('Missing translation') ||
        (argStr.includes('translation') && argStr.includes('missing')) ||
        (args.some(arg => typeof arg === 'string' && arg.includes('Component Stack') && arg.includes('translation'))) ||
        (args.some(arg => typeof arg === 'string' && arg.includes('Error Component Stack') && (arg.includes('Header') || arg.includes('AuthButtons'))))) {
      return;
    }
  }
  originalConsoleError.apply(console, args);
};

console.log('Loading Firebase services...');
try {
  // Ensure Firebase services are loaded
  require('./services/firebase');
  console.log('Firebase services loaded successfully!');
} catch (error) {
  console.error('Error loading Firebase services:', error);
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <App />
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
