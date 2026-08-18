import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { installNativeFetchBridge, isNativeApp } from './lib/nativeApiBridge';
import './index.css';
import '@zomako/elearning-components/dist/elearning-components.css';

installNativeFetchBridge();

async function bootstrapNativeChrome() {
  if (!isNativeApp()) return;
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: Style.Dark });
  } catch { /* plugin optional during early shell work */ }
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();
  } catch { /* ignore */ }
}

void bootstrapNativeChrome();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
