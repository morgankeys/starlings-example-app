import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.generated.css';
import './styles/type.generated.css';
import './styles/global.css';
import { App } from './app/App';
import { applyStoredTheme } from './app/theme';
import { startMockBackend } from './mocks/browser';

applyStoredTheme();

// Figma capture button (dev server only): click it, or press Ctrl+C, then paste into
// Figma for editable layers. Vite replaces import.meta.env.DEV with false in production
// builds, so this import is dropped; scripts/check-dev-pages.mjs fails the build if it
// ever leaks.
if (import.meta.env.DEV) {
  void import('figma-capture-button').then(({ initFigmaCapture }) => initFigmaCapture());
}

// The backend is simulated in the browser (see src/mocks). Start it before the first
// request; with a real API, drop this line.
startMockBackend().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
