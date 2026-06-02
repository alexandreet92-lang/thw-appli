# Branding — Logo THW

⚠️ **Fichiers à ajouter manuellement** (l'agent n'a pas pu accéder aux octets de
l'image collée dans le chat ni à un outil de traitement d'image — voir plus bas).

## Fichiers attendus dans ce dossier
| Fichier | Usage | Specs |
|---|---|---|
| `logo-thw-original.png` | archive | l'image fournie telle quelle |
| `logo-thw-dark.png` | mode nuit / fond sombre | lettres **cyan vif**, **fond transparent**, carré (≈512×512) |
| `logo-thw-light.png` | mode jour / fond clair + **email** | lettres **cyan foncé #0891B2**, **fond transparent**, carré |

Le mail d'achat de tokens (`src/app/api/topup/request-link/route.ts`) référence
déjà `logo-thw-light.png` en absolu :
`https://thw-appli.vercel.app/branding/logo-thw-light.png` (override possible via
l'env `EMAIL_LOGO_URL`). Tant que le PNG n'est pas déposé ici, l'email affiche un
lien d'image cassé (l'`alt="THW"` s'affiche à la place).

## Pourquoi ce n'est pas automatisé
Au moment du commit : pas d'ImageMagick, pas de `sharp`, pas de Node dans le
PATH, pas de Python PIL. Et l'image collée n'était pas accessible en fichier.

## Comment générer les fichiers (2 chemins)

### Chemin A — depuis la source du design (recommandé)
Exporter directement 2 PNG transparents depuis l'outil ayant créé l'icône :
- `logo-thw-dark.png` : lettres telles quelles (cyan vif), fond transparent.
- `logo-thw-light.png` : mêmes lettres recolorées en **#0891B2**, fond transparent.
Retirer le grand cadre/fond sombre extérieur — ne garder que les lettres THW.

### Chemin B — script `sharp` (si Node dispo)
1. Déposer une version **À FOND TRANSPARENT** des lettres en
   `public/branding/logo-thw-source.png` (le détourage du fond sombre dégradé
   doit être fait dans un éditeur ; un script ne le fait pas proprement sur un
   dégradé).
2. `npm i -D sharp`
3. `node scripts/process-logo.mjs`
   → génère `logo-thw-dark.png` (taille normalisée) et `logo-thw-light.png`
   (teinté #0891B2).
