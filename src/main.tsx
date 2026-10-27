import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.tsx';
import { AuthProvider } from '@/hooks/useAuth';
import { ToastProvider } from '@/hooks/useToast';
import { Toaster } from '@/components/ui/Toaster';
import { BackendStatusBanner } from '@/components/shared/BackendStatusBanner';
import { wakeBackend } from '@/services/apiClient';

// Fire a ping immediately so a sleeping Render backend starts waking while
// the user is still reading the landing/login page.
wakeBackend();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <App />
          <Toaster />
          <BackendStatusBanner />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
);
