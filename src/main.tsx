import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { Toaster } from '@/components/ui/sonner';

// Automatically check for new updates and ensure client has the latest app version
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.ready.then((registration) => {
    registration.update().catch(() => {});
  });

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // New service worker activated, reload to get fresh assets
    window.location.reload();
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Toaster position="top-center" />
  </StrictMode>,
);
