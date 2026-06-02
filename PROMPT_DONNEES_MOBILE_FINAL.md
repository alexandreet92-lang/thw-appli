# PROMPT_DONNEES_MOBILE_FINAL — Design mobile + corrections globales

## Fichiers modifiés
- src/app/globals.css
- src/app/activities/page.tsx

## FIX 1 — Fond blanc global (mode clair)
globals.css, `.light` / `:root` :
  --bg: #ffffff  (was #eef2f7)
  --bg-card2: #f8fafc  (inchangé)

## FIX 2 — Police Barlow Condensed pour les chiffres
globals.css :
  @import Barlow Condensed wght@600;700 (déjà 700, ajouter 600)
  .stat-number { font-family: 'Barlow Condensed', sans-serif; font-weight: 700;
                 font-variant-numeric: tabular-nums; letter-spacing: -0.01em; }

page.tsx : className="stat-number" sur :
  - Valeur TSB dans SVG arc (fontFamily inline)
  - Valeurs CTL/ATL/TSB cards (fontSize 28)
  - 4 stats tendances (fontSize 22)
  - StatCard value div (fontSize 22)

## FIX 3 — Header mobile sans titre "Données"
Sur mobile, left side = logo 4bras (24px) + spacer (supprime label section + dropdown)
Pas de borderBottom sous le header.
Garder les boutons droite identiques (App/refresh/livre).

## FIX 4 — Strava tabs mobile
Bloc sticky juste sous le header (mobile uniquement) :
  display flex, overflowX auto, scrollbarWidth none, background var(--bg), pas de border
  Chaque onglet : padding 12px 16px, fontSize 14px, fontWeight 600
    Inactif : color var(--text-dim)
    Actif : color #06B6D4 + barre 2.5px bas dégradé linear-gradient(90deg,#06B6D4,#3B82F6)
  Transition 250ms au changement d'onglet.

## FIX 5 — Contrôles compacts (mobile dans SectionDonnees)
useWindowWidth() à l'intérieur de SectionDonnees pour détecter isMobile.

Sur mobile — remplacer la rangée pills par 1 seule ligne :
  GAUCHE : dropdown période ("4 sem. ▼")
    padding 6px 12px, borderRadius 16px, border var(--border), bg var(--bg), fontSize 13px
    Tap → position:absolute, background var(--bg-card), border var(--border), borderRadius 12px,
           boxShadow 0 8px 24px rgba(0,0,0,0.12)
    Option active : background linear-gradient(135deg,#06B6D4,#3B82F6), color #fff
  DROITE : mini toggle Général/Spécifique
    Container background var(--bg-card2), borderRadius 16px, padding 2px
    Bouton actif : background var(--bg-card), color #06B6D4, boxShadow 0 1px 2px rgba(0,0,0,0.1)
    Bouton inactif : transparent, color var(--text-dim)

Sur desktop : comportement inchangé (pills existants)

## FIX 6 — Boutons actifs dégradé logo
Remplacer background: 'var(--text)' / color: 'var(--bg)' par :
  background: 'linear-gradient(135deg, #06B6D4, #3B82F6)'
  color: '#fff'
  border-color: transparent
Sur filter pills (période) et tab pills (Général/Spécifique) — desktop ET mobile.

## FIX 7 — Supprimer les traits entre sections
Retirer borderBottom du top bar header.
