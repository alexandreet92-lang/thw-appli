# PROMPT — Correctifs header / navigation (3 points) — passe 2

> App clair ET sombre. Tokens. Fichiers < 200 lignes.
> **Commit LOCAL. NE PAS PUSH. Aucun déploiement Vercel.**

## Constat (passe 1 déjà faite)
- Training : barre pleine + sidebar propre supprimées → `TabbedPageLayout` (fait, sur main).
- ☰ `DesktopShell` passé z-index 120 (fait).
- Boutons IA des shells = `/logos/logo_4bras.png` (shuriken Athéna confirmé visuellement).

## Re-vérification passe 2
- **Calendar** et **Planning** utilisent déjà `SectionLayout` (rail gauche + en-tête =
  titre + « ? »), **structurellement identique à Nutrition (la référence)**. Aucune barre
  pleine résiduelle au sens de Training. La seule chose « en haut » est la ligne de titre
  (h1 « Calendar »/« Planning ») + bouton aide — exactement comme Nutrition (h1 « Nutrition »).
- Correctif 1 (logo IA) : l'asset est déjà le bon ; reste un possible souci de **lisibilité**
  (shuriken bleu sur squircle dégradé cyan→violet → faible contraste).

## Actions de cette passe
- Correctif 1 : améliorer la lisibilité du shuriken (fond du bouton IA neutralisé/verre
  pour que le shuriken bleu ressorte), sans changer l'asset.
- Correctif 3 : confirmer ☰ z-index au-dessus de tout rail (sticky z5) — OK.
- Correctif 2 : selon décision utilisateur (voir question) — soit retirer les titres de
  page redondants (DS §4.1) pour un haut totalement épuré, soit laisser tel quel.

## Contraintes
TypeScript strict, aucun `any`. Aucune migration. Ne pas toucher `strava.ts`.
`npm run build` passe. Aucun emoji. **Commit local. NE PAS PUSH.**
