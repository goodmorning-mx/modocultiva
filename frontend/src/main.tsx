import React from 'react';
import ReactDOM from 'react-dom/client';
import { PwaRuntime } from '@goodmorning/gm-pwa';
import './styles.css';
import App from './App';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <PwaRuntime config={{ appName: 'Modo Cultiva', version: '2026.09.30', serviceWorkerUrl: '/sw.js' }}>
      <App />
    </PwaRuntime>
  </React.StrictMode>,
);
