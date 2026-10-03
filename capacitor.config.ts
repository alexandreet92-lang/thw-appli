import type { CapacitorConfig } from '@capacitor/cli'
// Type seul (aucun code du plugin n'est exécuté par la CLI Capacitor).
import type { KeyboardResize } from '@capacitor/keyboard'

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
    // PAS de backgroundColor figé : l'ancien '#0b0b0f' (noir) apparaissait en
    // BANDE NOIRE sous/autour du clavier en thème clair. Sans valeur, Capacitor
    // utilise UIColor.systemBackground (blanc en clair / noir en sombre) et le
    // plugin Keyboard recolore le fond de la fenêtre avec le fond réel de la page
    // à chaque ouverture du clavier (autoBackdropColor: 'dom', ci-dessous).
    // 'never' = webview EDGE-TO-EDGE. Les marges (encoche / home indicator) sont
    // gérées par le CSS via env(safe-area-inset-*) — que l'app utilise déjà
    // partout (barre d'onglets, contenu, écrans record). Avec 'always', iOS
    // insérait le contenu et laissait apparaître le fond NOIR du webview en bas
    // (bandes noires) : c'était la cause du « coupé en bas ».
    contentInset: 'never',
  },
  plugins: {
    // Clavier iOS (voir src/lib/native/keyboard.ts) :
    //  • 'native' par défaut → pour les champs « ordinaires », le webview est
    //    raccourci au-dessus du clavier (formulaires, feuilles…).
    //  • Les composeurs collés (`data-kb-glue`, ex. chat IA) basculent à la volée
    //    en 'none' et se placent eux-mêmes PILE sur le clavier, animés avec la
    //    même courbe qu'iOS (keyboardWillShow/keyboardWillHide) → zéro bande.
    //  • Le plugin retire aussi la gestion clavier propre au WKWebView
    //    (auto-scroll de la page qui faisait sortir l'en-tête de l'écran).
    //  • autoBackdropColor 'dom' : le fond derrière le clavier (coins arrondis,
    //    animation) = fond de <body> (suit le thème clair/sombre), jamais noir.
    Keyboard: {
      resize: 'native' as KeyboardResize,
      autoBackdropColor: 'dom',
    },
    // Capteurs BLE natifs (src/lib/ble/nativeBle.ts) : textes du sélecteur iOS
    // (requestDevice) — remplacés à l'exécution selon la langue de l'app.
    BluetoothLe: {
      displayStrings: {
        scanning: 'Recherche…',
        cancel: 'Annuler',
        availableDevices: 'Capteurs disponibles',
        noDeviceFound: 'Aucun capteur trouvé',
      },
    },
    // Écran de démarrage : court, sans spinner (le bundle local démarre vite).
    SplashScreen: {
      launchShowDuration: 600,
      backgroundColor: '#0b0b0f',
      showSpinner: false,
    },
  },
}

export default config
