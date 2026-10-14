// Starts the mock backend in the browser. The app's fetch calls to /api/v1/* are answered
// by the service worker from src/mocks/handlers; everything else passes through.
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export async function startMockBackend() {
  const worker = setupWorker(...handlers);
  await worker.start({
    onUnhandledRequest: 'bypass',
    quiet: true,
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
  });
}
