import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'jp.co.mozule.uranai',
  appName: 'Divination Workspace',
  // Vite build output. `npm run build` emits static assets here.
  webDir: 'dist',
  ios: {
    // Native WebView serves webDir from capacitor://localhost — absolute
    // "/assets/..." paths from the Vite build resolve correctly at that root.
    contentInset: 'always',
  },
  server: {
    // iOS uses capacitor://localhost as the app origin. The remote API
    // (VITE_API_BASE_URL) must allow this origin in ALLOWED_ORIGINS/CORS.
    iosScheme: 'capacitor',
  },
};

export default config;
