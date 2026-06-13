# Refonte SessionEditor — Layout flex (header/body/footer fixes)

## Fichier cible
`src/components/planning/SessionEditor.tsx` — return principal (ligne ~4567)

## Objectif
Passer de l'architecture « single scrollable div avec sticky header/footer »
à « flex column div avec header fixe + body scrollable (flex:1) + footer fixe ».

## Edits réalisés (chirurgicaux)

### 1. Sheet container (4579-4585)
- Ajout `display:'flex', flexDirection:'column'`
- Suppression `overflowY:'auto'` (le body interne gère le scroll)
- `background: 'var(--bg)'` → `background: 'var(--card)'`

### 2. Header (4590-4621)
- Nouveau layout : sport badge + title input + plan badge + close button (une seule ligne)
- Suppression `position:'sticky'` (inutile dans un flex fixe)
- `background: 'var(--bg)'` → `background: 'var(--card)'`

### 3. Body wrapper (inséré avant ligne 4623)
- `<div style={{ flex:1, overflowY:'auto', padding:... }}>` encapsule tout le contenu
- Fermé juste avant le séparateur (ligne 6818)

### 4. Footer (6821-7022)
- Suppression `position:'sticky'`
- `background: 'var(--bg)'` → `background: 'var(--card)'`
- Séparateur intégré dans le `borderTop` du footer

## Logique save
Conservée intégralement depuis les lignes originales.
