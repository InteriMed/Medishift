import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import './i18n'; // Import i18n configuration
import reportWebVitals from './reportWebVitals';

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
