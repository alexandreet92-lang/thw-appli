import type { CapacitorConfig } from '@capacitor/cli'

// ══════════════════════════════════════════════════════════════════════════
// Config Capacitor — app iOS packagée EN LOCAL (voir docs/PHASE5_CAPACITOR.md).
// Le bundle statique `out/` (généré par `npm run build:cap`) embarque tous les
// écrans → démarrage instantané. Les appels /api partent sur Vercel via
// NEXT_PUBLIC_API_BASE (voir src/lib/native/apiFetch.ts).
// ══════════════════════════════════════════════════════════════════════════

const config: CapacitorConfig = {
  appId: 'com.thehybridway.app',
  appName: 'Hybrid',
  webDir: 'out',
  ios: {
    // Fond de la webview cohérent avec le thème sombre (évite un flash blanc).
    backgroundColor: '#0b0b0f',
    // 'never' = webview EDGE-TO-EDGE. Les marges (encoche / home indicator) sont
    // gérées par le CSS via env(safe-area-inset-*) — que l'app utilise déjà
    // partout (barre d'onglets, contenu, écrans record). Avec 'always', iOS
    // insérait le contenu et laissait apparaître le fond NOIR du webview en bas
    // (bandes noires) : c'était la cause du « coupé en bas ».
    contentInset: 'never',
  },
  plugins: {
    // Écran de démarrage : court, sans spinner (le bundle local démarre vite).
    SplashScreen: {
      launchShowDuration: 600,
      backgroundColor: '#0b0b0f',
      showSpinner: false,
    },
  },
}

export default config
