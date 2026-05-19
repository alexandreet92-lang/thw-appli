# Logos — Mise à jour globale

## 1. Déplacer les fichiers

Déplacer les 4 PNG dans `public/logos/` :

| Source (racine repo)       | Destination                       |
|---------------------------|-----------------------------------|
| `logo_gradient_5.png`      | `public/logos/logo_app.png`       |
| `logo_gradient_3bras.png`  | `public/logos/logo_3bras.png`     |
| `logo_gradient_4bras.png`  | `public/logos/logo_4bras.png`     |
| `logo_gradient_6bras.png`  | `public/logos/logo_6bras.png`     |

> ✅ Déjà fait : logo_3bras.png, logo_4bras.png, logo_6bras.png sont dans public/logos/
> ✅ Déjà fait : logo_app.png copié depuis logo_gradient_5.png

## 2. Logo app en haut à gauche (navbar)

Composant : `src/components/shared/Sidebar.tsx` — section mobile top bar

- Remplacer le bloc gradient "THW" par `<img src="/logos/logo_app.png" />`
- Taille : 36×36px, border-radius 10px
- Lien cliquable → `/` (home)

> ✅ Implémenté

## 3. Logo IA en haut à droite (navbar)

- Bouton Assistant IA (mobile top bar + sidebar desktop) → `/logos/logo_4bras.png`, taille 44×44
- Comportement identique : ouvre le panneau Coach IA

> ✅ Déjà implémenté

## 4. Logos des modèles IA (Coach IA)

Mapping dans `src/components/ai/AIPanel.tsx` et `src/app/profile/page.tsx` :

| Modèle  | Logo                        |
|---------|-----------------------------|
| Hermès  | `/logos/logo_3bras.png`     |
| Athéna  | `/logos/logo_4bras.png`     |
| Zeus    | `/logos/logo_6bras.png`     |

> ✅ Déjà implémenté dans AIPanel.tsx (selector, messages, loading, empty state)
> ✅ Déjà implémenté dans profile/page.tsx (effigies)
