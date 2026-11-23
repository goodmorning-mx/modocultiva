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
    // Keep the launch screen as the top layer until React can replace it in one paint.
    document.getElementById('pwa-launch')?.remove();
  }, []);
  return <App />;
}

function mount() {
  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <AppEntry />
    </React.StrictMode>,
  );
}

const launchReady = (window as Window & { modoCultivaLaunchReady?: Promise<void> }).modoCultivaLaunchReady;
if (launchReady) void launchReady.then(mount);
else mount();
