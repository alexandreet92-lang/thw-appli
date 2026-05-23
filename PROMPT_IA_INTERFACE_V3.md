# PROMPT IA INTERFACE V3

## Note importante sur les chemins de fichiers

Le prompt original indique `/public/logo-3bras.png` (racine, tirets).
Les vrais fichiers sont à `/public/logos/logo_3bras.png` (sous-dossier `/logos/`, underscores).
Le code utilise les vrais chemins.

---

## 1 — SIDEBAR : icônes neutres pour Training et Networks

Training et Networks sont des **agents** (ce qu'ils font).
Hermès/Athéna/Zeus sont des **modèles** (niveau de puissance).
Concepts séparés. Pas de shuriken dans la sidebar nav.

Icônes :
- Projets → dossier SVG
- Training → haltère SVG 16px
- Networks → globe SVG 16px

## 2 — LOGOS SHURIKENS : uniquement dans l'écran vide, le header (non — voir #5) et la pill input

Mapping modèle → logo :
- Agent Training → Athéna → `/logos/logo_4bras.png`
- Agent Networks → Zeus → `/logos/logo_6bras.png`
- Hermès (interne, QuickActions) → `/logos/logo_3bras.png`

Tailles :
- Écran vide centré : 52px
- Pill input bar : 14px

## 3 — Couleurs sidebar

Inchangées : `#1A1A1A`, hover `rgba(255,255,255,0.06)`, actif `rgba(255,255,255,0.10)`.

## 4 — Bouton "Nouvelle conversation"

Pill blanche en bas (déjà conforme depuis V2).

## 5 — Header : nom agent SANS shuriken

Seul le texte centré "Training" ou "Networks", `font-semibold text-sm`.
Le shuriken disparaît du header.

## 6 — Pill input bar

Shuriken 14px + nom agent ("Training" ou "Networks").

## Règles de merge

- Merge direct sur main, jamais de PR
- `npm run build` doit passer avant push
- Pas d'emoji dans l'interface
- Ne pas modifier la logique des agents
- Chaque fichier modifié < 200 lignes
