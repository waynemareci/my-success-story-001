import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

(window.__ndaChecked || Promise.resolve()).then(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(<App />);
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const isMobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent);
    if (!isMobile) return;
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => console.log('[SW] Registered:', reg.scope))
      .catch((err) => console.error('[SW] Failed:', err));
  });
}
