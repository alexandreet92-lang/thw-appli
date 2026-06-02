# Mon Profil — navigation V2 (style Training)

`src/app/profile/page.tsx` (`ProfileContent`). 3 sections : Profil (User),
Notifications (Bell), Réglages IA (Zap).

## Desktop (≥1024px) — sidebar coulissante
- `aside` 220px sticky à gauche + contenu à droite (flex).
- Items = icône + titre + sous-titre :
  - Profil → « Identité et matériel »
  - Notifications → « Alertes et rappels »
  - Réglages IA → « Modèles et préférences »
- Actif : `background: rgba(6,182,212,0.10)` + barre verticale cyan 3px à gauche,
  titre + icône cyan. Hover : `var(--bg-hover)`.
- Shell élargi : `max-width: 1080px` (≥1024) pour loger sidebar + contenu.

## Mobile / tablet (<1024px) — onglets pleine largeur
- Conteneur `display:flex; width:100%`, chaque onglet `flex:1` → **33,33 %** chacun,
  `border-bottom` 1px.
- Inactif : `#94A3B8` / 600 ; actif : `#06B6D4` / 700.
- **Soulignement gradient** sous l'actif :
  `linear-gradient(90deg,#06B6D4,#5b6fff)`, 3px, `left/right:12`, `bottom:-1`.

## Animation de glissement (contenu)
- État `dir` ('right'/'left') calculé via `TAB_ORDER.indexOf(next) > indexOf(tab)`.
- Contenu `key={tab}` + classe `.profile-slide-right` / `.profile-slide-left`
  → keyframes `translateX(±30px)→0` + opacity, `280ms cubic-bezier(0.32,0.72,0,1)`.
  Le `key` rejoue l'animation à chaque changement (pas de classe à retirer).
- Clic à droite → glisse droite→gauche ; à gauche → gauche→droite.

## Persistance URL
`?tab=profil|notifications|ia` : lu au mount (`useSearchParams`), mis à jour via
`router.replace(..., { scroll:false })` au clic.

## Notes
- Sidebar de l'app inchangée (toujours visible sur /profile).
- Onglet « ia » conservé comme id (correspond aux blocs existants).
- npm run build : 0 erreur.
