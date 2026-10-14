import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.generated.css';
import './styles/global.css';
import { App } from './app/App';
import { applyStoredTheme } from './app/theme';
import { startMockBackend } from './mocks/browser';

applyStoredTheme();

// The backend is simulated in the browser (see src/mocks). Start it before the first
// request; with a real API, drop this line.
startMockBackend().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
