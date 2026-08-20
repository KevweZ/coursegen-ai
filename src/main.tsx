import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import { installNativeFetchBridge, isNativeApp } from './lib/nativeApiBridge';
import { getAppPath, navigateTo, normalizeCapacitorLocation, ROUTES, usesHashRouting } from './lib/routes';
import './index.css';
import '@zomako/elearning-components/dist/elearning-components.css';

installNativeFetchBridge();
normalizeCapacitorLocation();

async function bootstrapNativeChrome() {
  if (!isNativeApp() && !usesHashRouting()) return;
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: Style.Dark });
  } catch { /* plugin optional during early shell work */ }
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();
  } catch { /* ignore */ }
  try {
    const { App: CapApp } = await import('@capacitor/app');
    await CapApp.addListener('backButton', ({ canGoBack }) => {
      // Prefer in-app history (hash routes) over exiting the shell.
      if (canGoBack && window.history.length > 1) {
        window.history.back();
        return;
      }
      const path = getAppPath();
      if (path !== ROUTES.upload && path !== ROUTES.home && path !== '/') {
        navigateTo(ROUTES.upload, true);
        return;
      }
      void CapApp.exitApp();
    });
  } catch { /* App plugin optional */ }
}

void bootstrapNativeChrome();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary fallbackTitle="Something went wrong in the app">
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
);
