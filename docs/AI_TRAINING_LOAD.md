# Charge d'entraînement (CTL/ATL/TSB) branchée à l'IA et au coach

Correction d'une analyse antérieure : le **modèle de charge existait déjà** et
était correct (`src/lib/training/pmc.ts` — EWMA CTL 42 j / ATL 7 j / TSB =
CTL−ATL, seuils, verdicts), utilisé par les pages Forme/Récup. Ce qui manquait :
il n'était **ni persisté ni utilisé par l'IA**. C'est corrigé.

## Ce qui a été fait

1. **Calcul « à la date »** : `loadAsOf(activities, date)` dans `pmc.ts` (pur,
   client + serveur) → CTL/ATL/TSB au jour de la séance, tendance TSB (7 j),
   tendance CTL, verdict, drapeau `overload` (TSB ≤ -20).
   Helper serveur : `pmcServer.computeUserLoad(sb, userId, asOf)`.
2. **L'analyse IA de séance utilise la charge** (manuelle *et* auto après sync) :
   le contexte inclut désormais un bloc CTL/ATL/TSB + tendance, et le prompt
   demande d'interpréter la **surcharge / fraîcheur** (TSB), plus fiable que la
   somme brute de TSS.
3. **Persistance** : cron `/api/metrics/pmc-rebuild` (nuit, `0 4 * * *`) écrit le
   PMC du jour dans `metrics_daily` (ctl/atl/tsb) → lecture bon marché côté coach.
4. **Suivi coach branché** :
   - roster (page + serveur) : statut **« surcharge »** quand TSB ≤ -20 (avant
     la fatigue subjective) ;
   - **digest** coach : ligne dédiée « 🔥 surcharge » distincte de la fatigue ;
   - outil IA coach `roster_overview` : renvoie ctl/atl/tsb + `overload` →
     « qui est en surcharge ? » répond juste.

## Activation
- Rien de spécial : le cron `pmc-rebuild` tourne au déploiement. Tant qu'il n'a
  pas tourné une fois, `metrics_daily.tsb` est vide → pas de drapeau surcharge
  (comportement inchangé), puis ça se remplit chaque nuit.
- L'analyse IA calcule la charge en direct (elle ne dépend pas du cron).

## Reste possible (plus tard)
- Fiabiliser le TSS source (dont dépendent CTL/ATL) pour les activités sans
  puissance/FC.
- Afficher le TSB dans la fiche athlète coach et le tableau roster (colonne).
