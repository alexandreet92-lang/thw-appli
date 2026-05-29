# PROMPT_INFOBOX_COLOR — Fond des boîtes d'explication en dark mode

## Problème 1 — Couleur de fond des boîtes en mode sombre
Les boîtes d'explication (dérive cardiaque, durée cumulée FC) apparaissaient
en bleu foncé (#1E293B) en dark mode alors que la page est quasi-noire (#020617).

## Fix appliqué — `src/app/globals.css`
Dans `.dark` et `@media (prefers-color-scheme: dark)` :
- `--info-bg`     : `#1E293B` → `#020617` (même que le fond de page)
- `--info-border` : `#334155` → `#1e293b` (la bordure garde une teinte pour délimiter)

Résultat :
- Mode clair  : boîtes #F8FAFC (inchangé ✓)
- Mode sombre : boîtes #020617 = fond de page, seule la bordure délimite

## Problème 2 — Suppression des emojis dans les blocs d'explication
Dans `src/app/activities/page.tsx` (blocs dérive cardiaque + durée cumulée FC) :
- `🌡️` supprimé (ligne "Influence de la chaleur")
- `🎯` supprimé (ligne "Le seuil des 90% FCmax")

Les emojis dans d'autres contextes (planning, injuries, UI labels) ne sont
pas concernés — ils n'appartiennent pas aux boîtes d'explication.
