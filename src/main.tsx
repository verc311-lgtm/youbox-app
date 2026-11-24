import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Cuando se publica una nueva versión, los archivos (chunks) antiguos dejan de existir en el servidor.
// Si un usuario tiene la app abierta o en caché, al navegar a una página (ej. Pre-Alertas) la carga falla
// y la pantalla queda en blanco o los botones no responden. En ese caso recargamos para obtener la versión nueva.
const RELOAD_KEY = 'youbox_chunk_reload_at';
const reloadForNewVersion = () => {
  const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
  if (Date.now() - last > 10000) {
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
    window.location.reload();
  }
};

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  reloadForNewVersion();
});

window.addEventListener('unhandledrejection', (event) => {
  const msg = String((event.reason && (event.reason.message || event.reason)) || '');
  if (/dynamically imported module|Importing a module script failed|error loading dynamically imported module|Failed to fetch dynamically/i.test(msg)) {
    reloadForNewVersion();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
