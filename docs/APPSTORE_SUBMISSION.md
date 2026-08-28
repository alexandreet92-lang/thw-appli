# Soumission App Store — checklist (app iOS « Hybrid », Capacitor)

Ce guide complète `PHASE5_CAPACITOR.md`. Il liste tout ce qu'il faut pour
**soumettre** l'app à l'App Store. Les étapes marquées 🖥️ **Mac requis**
(Xcode) ne peuvent pas être faites ici — elles sont prêtes à exécuter.

> ⚠️ **Règle produit centrale — AUCUN PRIX DANS L'APP.**
> Le paiement se fait par **Stripe, sur le site web**, jamais en in-app-purchase.
> Le code masque déjà tous les prix / boutons d'achat dans le build natif via
> `hidePricing()` (`src/lib/native/platform.ts`), activé par le drapeau
> `NEXT_PUBLIC_NATIVE_APP=1` posé dans `scripts/build-cap.mjs`.
> Ne JAMAIS ajouter dans l'app iOS : un tarif, un « /mois », un bouton
> « acheter/s'abonner » qui déclenche un paiement, ni un lien cliquable vers
> le checkout Stripe. On peut au plus afficher une phrase neutre
> (« Abonnement à gérer sur le site web »), non cliquable.

---

## 1. Identité de l'app
- **Bundle ID** : `com.thehybridway.app` (déjà dans `capacitor.config.ts`)
- **Nom** : Hybrid
- **Version** : 1.0.0 · **Build** : 1
- **Catégorie** : Forme et santé (primaire) · Sports (secondaire)

## 2. Autorisations Info.plist 🖥️
À ajouter dans `ios/App/App/Info.plist` (après `npx cap add ios`). Textes
d'usage clairs (Apple rejette les textes vagues) :

| Clé | Raison | Texte suggéré (FR) |
|-----|--------|--------------------|
| `NSLocationWhenInUseUsageDescription` | Tracé GPS des séances | « Hybrid utilise ta position pour enregistrer le tracé GPS de tes séances. » |
| `NSLocationAlwaysAndWhenInUseUsageDescription` | GPS en arrière-plan pendant l'enregistrement | « Autorise la position en arrière-plan pour continuer à enregistrer ta séance écran éteint. » |
| `NSMotionUsageDescription` *(si podomètre ajouté)* | Cadence/pas | « Utilisée pour estimer ta cadence. » |
| `NSCameraUsageDescription` | Photos d'activité / avatar / scan | « Pour prendre des photos de tes séances, ton profil ou scanner un aliment. » |
| `NSPhotoLibraryUsageDescription` | Choisir une photo | « Pour choisir une photo depuis ta galerie. » |
| `NSPhotoLibraryAddUsageDescription` | Enregistrer une image | « Pour enregistrer une image dans ta galerie. » |
| `NSMicrophoneUsageDescription` | IA vocale | « Pour parler à ton coach IA à la voix. » |
| `NSBluetoothAlwaysUsageDescription` | Capteurs (FC, puissance, cadence) | « Pour te connecter à tes capteurs cardio/puissance en Bluetooth. » |

**Background modes** (`Signing & Capabilities` → Background Modes) :
- ☑︎ Location updates (GPS séance écran éteint)
- ☑︎ Uses Bluetooth LE accessories (capteurs)

## 3. Privacy manifest 🖥️
Créer `ios/App/App/PrivacyInfo.xcprivacy` (requis par Apple 2024+). Capacitor
utilise des « required-reason APIs » (UserDefaults, timestamps fichiers). Base :
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>NSPrivacyTracking</key><false/>
  <key>NSPrivacyTrackingDomains</key><array/>
  <key>NSPrivacyCollectedDataTypes</key><array/>
  <key>NSPrivacyAccessedAPITypes</key>
  <array>
    <dict>
      <key>NSPrivacyAccessedAPIType</key>
      <string>NSPrivacyAccessedAPICategoryUserDefaults</string>
      <key>NSPrivacyAccessedAPITypeReasons</key><array><string>CA92.1</string></array>
    </dict>
    <dict>
      <key>NSPrivacyAccessedAPIType</key>
      <string>NSPrivacyAccessedAPICategoryFileTimestamp</string>
      <key>NSPrivacyAccessedAPITypeReasons</key><array><string>C617.1</string></array>
    </dict>
  </array>
</dict></plist>
```
`NSPrivacyTracking=false` : l'app ne fait pas de suivi cross-app → **pas de
prompt ATT** nécessaire.

## 4. Icône & splash 🖥️
- Icône 1024×1024 (sans alpha, sans coins arrondis) → App Icon set dans Xcode.
- Splash : fond `#0b0b0f` (déjà configuré). Générer via `@capacitor/assets`
  (`npx @capacitor/assets generate --ios`) à partir d'un `assets/icon.png` +
  `assets/splash.png`.

## 5. Fiche App Store Connect
- **Nom** : Hybrid — Coaching hybride
- **Sous-titre** (30 car.) : Endurance + force, coaché par l'IA
- **Description** : app de coaching sportif hybride (course, vélo, muscu, Hyrox…) :
  plans IA, analyse d'activités, suivi charge/récup, nutrition, communauté.
- **Mots-clés** : coaching,running,cyclisme,hyrox,musculation,HRV,plan,triathlon
- **URL support** : https://thehybridway.app/support · **Confidentialité** : …/privacy
- **Compte de démo** : fournir un login test (Apple review en a besoin).
- **App Privacy** (questionnaire) : déclarer les données collectées (email,
  données d'entraînement/santé, contenu utilisateur) ; **Tracking : non**.
- **Langues** : FR, EN, ES (l'app est traduite dans les 3).

## 6. Conformité paiement (le point sensible)
- ✅ Prix masqués dans l'app native (`hidePricing()`).
- L'app est utilisable avec un compte déjà abonné (connexion) ; l'abonnement
  se souscrit/gère **sur le web**. Ne pas mettre de lien d'achat cliquable dans
  l'app. Si Apple demande, positionner l'app en **« reader »** (accès à du
  contenu acheté ailleurs), sans création de compte payant in-app.

## 7. Étapes finales 🖥️ (sur le Mac)
```bash
npm run build:cap            # génère out/
npx cap add ios              # 1re fois seulement → crée ios/
npx cap sync ios             # copie le bundle + plugins
# → ajouter les clés Info.plist + PrivacyInfo.xcprivacy + Background Modes + icône
npx cap open ios             # ouvre Xcode
# Xcode : Team de signature, incrémenter Build, Product → Archive → Distribute App
```

## 8. Reste à valider avant envoi
- [ ] Tester le build natif : `NEXT_PUBLIC_NATIVE_APP=1` → vérifier qu'AUCUN
      prix n'apparaît (onboarding, profil, réglages abonnement, topup, programmes).
- [ ] Push : le Web Push ne fonctionne pas en WKWebView — pour des notifications
      natives, ajouter `@capacitor/push-notifications` + APNs (sinon, désactiver
      proprement le bloc push dans l'app native). *(chantier séparé)*
- [ ] Deep-links / retour arrière iOS (safe-area déjà gérée).
- [ ] Compte de démo review + captures d'écran (6,7" et 5,5").
