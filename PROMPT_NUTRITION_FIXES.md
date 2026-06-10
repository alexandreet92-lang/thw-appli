# Corrections — marges & titres redondants (onglets Nutrition refondus)

## Cadre
Deux corrections appliquées de façon cohérente sur les 4 onglets Nutrition refondus
(Aujourd'hui, Mon plan, Suivi, Composition). Aucune autre page touchée.

## Phase 0 — Repérage (constats)
- **Conteneur de contenu** : `src/app/nutrition/page.tsx` — `<div className="px-4 md:px-8 …">`
  (16px mobile / 32px desktop). Header global « Nutrition » à `padding:'20px 20px 0'`.
  Onglets extraits : `components/{today,plan,suivi,composition}`.
- **Titres redondants** repérés : H1 `var(--font-display)` répétant le nom de l'onglet —
  `TodayTab` (« Aujourd'hui » + date), `PlanTab` (« Mon plan » + « Actif · semaine… »),
  `SuiviSection` (« Suivi » + sélecteur période), `CompositionTab` (« Composition »).

## Phase 1 — Marges (réalisé)
- Conteneur de contenu : `px-[var(--space-5)] md:px-[var(--space-8)]` (20/32px, tokens).
- Header global aligné sur les mêmes tokens (`px-[var(--space-5)] md:px-[var(--space-8)]`).
- `WeightGraph` : la zone de scroll reçoit un padding interne horizontal
  (`var(--space-8)` desktop / `var(--space-1)` mobile) → les chevrons ne rognent plus
  la courbe et la donnée ne touche pas le cadre. Aucune valeur d'espacement en dur.

## Phase 2 — Suppression des titres redondants (réalisé)
- **Aujourd'hui** : H1 « Aujourd'hui » supprimé ; la **date** (`dateLabel`) promue en
  `var(--font-display)` ~20-22px, devient l'en-tête.
- **Mon plan** : H1 « Mon plan » supprimé ; la **semaine** (`weekOf`, capitalisée) promue
  en en-tête `var(--font-display)` ~20-22px + « · actif » discret. Pas de plan actif →
  pas d'en-tête (la carte d'invitation porte son propre titre).
- **Suivi** : H1 « Suivi » supprimé ; démarre directement sur le sélecteur de période
  (conservé) + le bilan.
- **Composition** : H1 « Composition » supprimé ; démarre sur la bannière balance + les
  bascules de métrique.
- Le libellé global « Nutrition » (nom de section) est conservé.

## Phase 3 — Design system (réalisé)
Ajout à `docs/DESIGN_SYSTEM.md` :
- §3 : règle de padding de contenu (desktop ≥ `--space-8`, mobile ≥ `--space-5`,
  identique partout ; un défilable garde un padding interne).
- §4 : principe « ne pas répéter le nom de la page/onglet en titre ; l'en-tête porte un
  contexte utile (date, période, état) ».

## Contraintes respectées
Tokens d'espacement uniquement, zéro couleur en dur, zéro mock, TypeScript strict,
≤200 lignes/fichier, build vert, aucun emoji, commit local, pas de push.
