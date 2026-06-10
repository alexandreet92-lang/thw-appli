# Audit du design system et des écarts — LECTURE SEULE

## Objectif
Diagnostic avant une refonte esthétique globale. Tu ne modifies AUCUN fichier de code.
Tu produis un seul livrable : `docs/AUDIT_DESIGN.md`.

## Phase 1 — État du design system documenté
1. Copier INTÉGRALEMENT le contenu actuel de `docs/DESIGN_SYSTEM.md` dans une
   section "Contenu actuel du design system" de l'audit.
2. Lister les variables CSS globales réellement définies (globals.css ou
   équivalent) : couleurs, radius, ombres, espacements, polices. Pour chaque
   variable : nom, valeur light, valeur dark.
3. Lister les polices chargées dans l'app (next/font ou autre) et où chacune
   est utilisée (titres, corps, nombres).

## Phase 2 — Audit des 4 pages Nutrition (Aujourd'hui, Mon plan, Suivi, Composition)
Pour CHAQUE page, documenter avec chemins de fichiers et numéros de lignes :

1. **Couleurs en dur** : toute couleur hex/rgb/hsl écrite directement dans le
   code (hors variables CSS). Lister chaque occurrence.
2. **Surfaces colorées** : toute carte, badge ou bloc avec un fond coloré
   (vert/jaune/rouge/cyan) ou une bordure colorée pleine. Ex. attendu : les
   cartes Low/Mid/Hard de Mon plan.
3. **Typographie** : où du monospace est utilisé pour des nombres ou du texte
   (en violation de la convention Inter + tabular-nums). Lister toutes les
   tailles de police distinctes utilisées sur la page (compter les valeurs
   uniques de text-* ou font-size).
4. **Bordures** : compter approximativement les éléments avec border visible
   sur la page (cartes, boutons, pilules, inputs). Identifier les composants
   qui pourraient se séparer par espacement/fond plutôt que par bordure.
5. **Composants** : quels composants partagés sont utilisés (boutons, cartes,
   badges) vs. quels éléments sont stylés inline/dupliqués localement.
6. **Badges et répétitions** : éléments d'UI répétés à l'identique sur la même
   vue (ex. badge "à compléter" x4 sur Aujourd'hui).

## Phase 3 — Audit transversal rapide
1. Vérifier si d'autres pages principales (Planning, Stats/Training, Recovery,
   Recording) utilisent les mêmes patterns ou ont chacune leur propre style.
   2-3 lignes par page suffisent : police des nombres, surfaces colorées
   oui/non, cohérence des cartes avec Nutrition.
2. Conclure : le problème est-il (a) un design system incomplet, (b) un design
   system ignoré par le code, ou (c) les deux. Justifier en une phrase par page.

## Contraintes
- LECTURE SEULE sur tout le code. Le seul fichier créé/modifié est
  `docs/AUDIT_DESIGN.md` (+ ce PROMPT_AUDIT_DESIGN.md).
- Aucune migration, aucun changement de schéma, ne pas toucher
  `src/lib/sync/strava.ts`.
- Commit en local uniquement. NE PAS push sur main, aucun déploiement Vercel.
- Pas de recommandations de refonte dans l'audit : des FAITS (fichier, ligne,
  valeur). La stratégie de refonte sera décidée séparément.
