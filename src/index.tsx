import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import ErrorBoundary from './components/ErrorBoundary';

// Add a global error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled Promise Rejection:', event.reason);
});

// Add a console message to help debug Vercel deployments
console.log('Application starting...');
console.log('Environment:', process.env.NODE_ENV);
console.log('PUBLIC_URL:', process.env.PUBLIC_URL);
console.log('REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
console.log('Window location:', window.location.href);

// Hide initial loader
const hideLoader = () => {
  const loader = document.getElementById('initial-loader');
  if (loader) {
    loader.style.display = 'none';
  }
};

// Mark React as loaded for the fallback timer
const markReactLoaded = () => {
  (window as any).reactLoaded = true;
};

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

try {
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
  console.log('Root render completed');
  
  // Hide loader and mark React as loaded
  hideLoader();
  markReactLoaded();
} catch (error) {
  console.error('Error during initial render:', error);
  
  // Hide loader
  hideLoader();
  
  // Display a basic error message if something went wrong before the error boundary could catch it
  document.getElementById('root')!.innerHTML = `
    <div style="padding: 20px; text-align: center;">
      <h1>Something went wrong</h1>
      <p>The application failed to start properly.</p>
      <pre style="text-align: left; background: #f5f5f5; padding: 10px; margin-top: 20px;">
        ${error instanceof Error ? error.stack : String(error)}
      </pre>
      <button onclick="window.location.reload()" style="margin-top: 20px; padding: 8px 16px;">
        Reload Page
      </button>
    </div>
  `;
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
