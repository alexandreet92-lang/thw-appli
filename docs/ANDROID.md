# App Android (Capacitor) — mise en place

L'app Android réutilise **exactement le même bundle web** que l'app iOS (`out/`),
donc toutes les fonctionnalités (IA, photos, modération, communauté…) marchent à
l'identique. Il n'y a que la coquille native à générer.

## Prérequis (une fois)
- **Android Studio** installé (https://developer.android.com/studio) + un JDK 17.
- Un compte **Google Play Console** (25 $ une seule fois) pour publier.

## 1. Installer la plateforme Android
```bash
npm install                      # récupère @capacitor/android (déjà dans package.json)
npm run build:cap                # génère le bundle statique out/
npx cap add android              # crée le dossier android/ (une seule fois)
npx cap sync android             # copie out/ + plugins dans le projet Android
```

## 2. Ouvrir et lancer
```bash
npx cap open android             # ouvre Android Studio
```
Dans Android Studio : sélectionner un émulateur ou un téléphone branché, puis ▶️ Run.

## 3. À chaque changement du code web
```bash
npm run build:cap && npx cap sync android
```

## 4. Config native à vérifier (dans android/app/src/main/)
- **Permissions** (`AndroidManifest.xml`) : caméra + photothèque pour les pièces
  jointes (`android.permission.CAMERA`, lecture média). Capacitor/Camera les ajoute
  en général automatiquement — vérifier après le premier `cap sync`.
- **Nom + icône** : `res/values/strings.xml` (app_name = « Hybrid ») et les icônes
  `res/mipmap-*`.
- **applicationId** = `com.thehybridway.app` (déjà défini via capacitor.config.ts).

## 5. Publier sur Google Play
1. Android Studio → **Build > Generate Signed Bundle / APK > Android App Bundle (.aab)**.
   Créer/uploader une **clé de signature** (à conserver précieusement).
2. Google Play Console → créer l'app → téléverser le `.aab` → remplir fiche,
   captures, classification de contenu, politique de confidentialité.
3. La modération (signalement/blocage) et les CGU « tolérance zéro » déjà en place
   couvrent aussi les exigences Google Play (contenu généré par les utilisateurs).

## 6. Renseigner le lien de téléchargement sur le site
Une fois l'app publiée, mettre l'URL Play Store dans
`public/site/components/site/Discover.jsx` → `PLAY_STORE_URL = '...'`.

---
**Note** : en attendant l'app native, les utilisateurs Android peuvent déjà
utiliser l'app **dans leur navigateur** (thw-appli.vercel.app) et l'installer via
« Ajouter à l'écran d'accueil » (PWA — next-pwa est déjà configuré).
