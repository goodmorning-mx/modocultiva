import React, { useLayoutEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';
import App from './App';

if ('serviceWorker' in navigator) {
  void navigator.serviceWorker.register('/sw.js').catch((error) => {
    console.warn('No se pudo registrar la PWA', error);
  });
}

function AppEntry() {
  useLayoutEffect(() => {
    // Keep the first-paint screen up until React commits, without delaying the app.
    document.getElementById('pwa-launch')?.remove();
  }, []);
  return <App />;
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AppEntry />
  </React.StrictMode>,
);
