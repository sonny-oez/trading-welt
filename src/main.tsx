import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import '@fontsource/outfit/400.css';
import '@fontsource/outfit/500.css';
import '@fontsource/outfit/600.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import App from './App';
import './index.css';

if (import.meta.env.PROD) {
  registerSW({ immediate: true });
}

const root = document.getElementById('root');
if (!root) throw new Error('root fehlt');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
