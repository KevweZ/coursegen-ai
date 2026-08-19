import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor shell for NexCourse — side-project branch only.
 * Pilot users stay on the web app at nexcourse.ai until an intentional merge.
 */
const config: CapacitorConfig = {
  appId: 'ai.nexcourse.app',
  appName: 'NexCourse AI',
  webDir: 'dist',
  server: {
    // Allow cleartext only for local API debugging; production uses https://nexcourse.ai
    androidScheme: 'https',
    iosScheme: 'https',
  },
  plugins: {
    // Android WebView fetch often fails for third-party HTTPS (e.g. Supabase auth).
    // Native HTTP patching fixes "Failed to fetch" on sign-in in the emulator/device.
    CapacitorHttp: {
      enabled: true,
    },
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#0f172a',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0f172a',
    },
    Keyboard: {
      resize: 'body',
    },
  },
};

export default config;
