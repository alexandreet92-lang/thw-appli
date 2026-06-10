# Performance / Datas › Year Datas — refonte

## Phase 0 — État réel (constat important)
`YearDatasSubTab` (DatasTab.tsx:4011, ~1 780 l.) contient les charts **et** toute l'UI de
sync/import Strava + l'éditeur manuel. Constat en ouvrant le code :
- **Barres déjà colorées + animées** : « Comparaison par année » utilise **déjà** la
  couleur du sport (`SPORT_DS_COLOR[activeSport]`) + animation `ydBarEnter` ; « Volume
  global » utilise **déjà** une couleur par métrique (#06b6d4 / #f97316 / #3b82f6) +
  `ydBarEnter`. → Les items 3, 4, 6 de la checklist étaient déjà satisfaits.
- **Décoratif restant** : les 4 stats en `DM Mono` **couleur du sport** ; titres en
  `Syne` ; valeurs des barres globales en **blanc dans la barre** ; couleurs en dur.

## Slice réalisée
1. **4 cartes de stats** : chiffres **neutres** `var(--text)` + `var(--font-body)` `.tnum`
   (plus de DM Mono ni couleur sport). Bloc déjà sur `--bg-card2` sans bordure.
2. **Titres** « Comparaison par année » et « Volume global » → `var(--font-display)`
   (Fraunces) 15px, sans barre colorée.
3. **Volume global** : couleurs par métrique **tokenisées** (`--metric-heures #06b6d4`,
   `--metric-sorties #f97316`, `--metric-distance #3b82f6`, globals) ; **valeurs au-dessus
   de la barre, neutres** (`var(--text)`, plus de blanc-dans-la-barre en DM Mono).
4. Comparaison par année : couleur du sport conservée, animation conservée, titre Fraunces.
5. Volume par sport (lignes) : couleurs de sport conservées (déjà calmes), inchangé.
Build vert, enforce 0 couleur (34 fichiers). Restyle en place dans `DatasTab` (non
enforced ; extraction de la vue = slice ultérieure).

## Checklist (honnête)
- [x] 4 stats en chiffres neutres, sans carte bordée.
- [x] Volume par sport : lignes en couleurs de sport, calmes (déjà le cas).
- [x] Barres « Comparaison par année » colorées en couleur du sport (+ titre Fraunces).
- [x] Barres « Volume global » colorées par métrique (tokenisées) (+ titre Fraunces).
- [x] Chiffres au-dessus des barres neutres (Volume global : déplacés au-dessus, neutres).
- [x] Barres animées au montage (`ydBarEnter`).
- [~] **Mode Manuel en feuille — NON fait** : la saisie manuelle reste **inline** (liste +
      « + Saisir »). La transformer en feuille coulissante demande d'extraire un éditeur
      conséquent imbriqué avec la logique Strava → slice dédiée (documentée).
- [~] **Cartes des 2 graphes** : « Comparaison » et « Volume global » restent enveloppés
      dans le `<Card>` (bordé) local de `DatasTab` ; non retiré ici pour ne pas casser le
      padding/layout partagé (le `Card` est utilisé par toute la vue) → à faire lors de
      l'extraction de la vue.

## Reste à faire (plan)
- Extraire `YearDatasSubTab` en composant(s) < 200 l. enforced (retrait des `<Card>`,
  sections par espace).
- Éditeur manuel → feuille coulissante (createPortal).
- Tokeniser les couleurs sport restantes (`SPORT_DS_COLOR`) + l'UI de sync Strava.

## Contraintes respectées
TS strict, zéro mock, `npm run build` vert, aucun emoji, commit local, pas de push.
`strava.ts` intact, aucune migration.
