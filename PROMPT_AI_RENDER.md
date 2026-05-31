# PROMPT_AI_RENDER — Markdown IA + prompt concis + esthétisme bulle

## FIX 1 — ReactMarkdown dans AIBubble
- `npm install react-markdown` → installé
- Remplacer `<div style={{ whiteSpace:'pre-wrap' }}>` par `<ReactMarkdown components={markdownComponents}>`
- Composants custom : h1–h3, p, strong, ul, li, table/thead/tr/th/td, hr
- Variables CSS mappées : `var(--fg)` → `var(--text)`, `var(--fg3)` → `var(--text-dim)`, `var(--bg2)` → `var(--bg-card2)`

## FIX 2 — Prompt découplage plus concis
Dans `buildDecouplingPrompt` : remplacer les instructions de format texte libre
par un template markdown structuré (tableau, ##, ###, ---EN CLAIR---).
Max 300 mots. Score /10 en fin de PARTIE 2.

## FIX 3 — Esthétisme bulle
- Conteneur : `var(--bg)` bg, borderRadius `4px 16px 16px 16px`, padding 20/24, maxWidth 90%, légère ombre
- Labels section : 10px, uppercase, letterSpacing .1em, `var(--text-dim)`, séparés par borderBottom
- Séparateur parties : margin 20px, borderTop
- Boutons : alignés à droite, séparés par borderTop, sans border autour
- Avatar : 34px, border `rgba(6,182,212,0.2)`, marginTop 2px

## Fichiers modifiés
- src/components/activity/AIBubble.tsx
- src/app/activities/page.tsx (buildDecouplingPrompt uniquement)
