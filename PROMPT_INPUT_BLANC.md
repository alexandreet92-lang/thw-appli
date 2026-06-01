# Champ d'écriture blanc pur (mode clair)

## Problème
Le champ de saisie est grisé en mode clair dans :
1. l'AI Coach (`.aip-input-wrap` → `background: var(--ai-bg2)` = `--bg-alt` #e4eaf2)
2. /competences colonne "Créer" (`.comp-input-wrap` → `var(--input-bg)`)
3. modal détail section "Remodeler" (même `.comp-input-wrap`)

## Correctif
Fond `#FFFFFF` en mode clair, bordure + ombre pour le distinguer du fond blanc,
glow cyan au focus. En mode sombre, fond foncé cohérent (`#1C2333`).

### Mode clair
- background `#FFFFFF`
- border `1.5px solid rgba(0,0,0,0.10)`
- box-shadow `0 2px 8px rgba(0,0,0,0.06)`
- focus : border `#06B6D4`, box-shadow `0 0 0 3px rgba(6,182,212,0.12), 0 2px 8px rgba(0,0,0,0.06)`

### Mode sombre (`html.dark`)
- background `#1C2333`, border `rgba(255,255,255,0.10)`, pas d'ombre
- focus : border `#06B6D4`, box-shadow `0 0 0 3px rgba(6,182,212,0.15)`

### Application
- `.comp-input-wrap` (globals.css) → couvre /competences création + modal.
- `.aip-input-wrap` (bloc `<style>` de AIPanel) → AI Coach (override des règles
  `!important` existantes + variante `html.dark`).

## BUG 2 — ligne grise en bas de /competences (mobile)
Cause : le `<main>` mobile a `padding-bottom: calc(80px + safe-area)` réservé à
la tabbar (désormais masquée sur /competences) → laisse voir `var(--bg)` (gris).
Fix : `main:has(.competences-mobile-root) { padding-bottom: 0 !important }` +
className `competences-mobile-root` sur la racine mobile de la page.

npm run build : 0 erreur.
