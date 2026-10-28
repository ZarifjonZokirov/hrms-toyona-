import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ThemeProvider } from './context/ThemeContext.tsx';

// Automatically attach internal security token to all HRMS /api/ requests
const HRMS_INTERNAL_TOKEN = 'ts_hrms_internal_v5_9f8a7b6c';
if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (urlStr.startsWith('/api/') || urlStr.includes('/api/')) {
      const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
      if (!headers.has('X-HRMS-Internal-Token')) {
        headers.set('X-HRMS-Internal-Token', HRMS_INTERNAL_TOKEN);
      }
      return originalFetch(input, { ...init, headers });
    }
    return originalFetch(input, init);
  };
}

// Prevent unhandled cross-origin script error from disrupting app in iframe
window.addEventListener('error', (event) => {
  if (event.message === 'Script error.' || event.message === 'Script error') {
    event.preventDefault();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
);

