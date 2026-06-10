# Nouvelle page — Blessures (douleurs & blessures)

## Cadre
Refonte/création de la page « Blessures » dans le langage de design. Modèle : une
entité « signalement » sur un continuum de **sévérité** (gêne/douleur/blessure) +
**phase de guérison** (aiguë → récupération → réathlétisation → résolu). Pas de 3D (V2).
3 onglets (Aperçu / Historique / Analyse) + 2 feuilles (Signaler / Suivi).

## Phase 0 — Constats (lecture seule)
- **Route existante** : `/injuries` était une page **état local + corps 3D** (462 l. +
  `Body3DCanvas.tsx`), **sans table Supabase**. Aucun import externe → remplacement sûr.
  `Body3DCanvas.tsx` **supprimé** (3D reportée V2).
- **Navigation** : l'entrée « Blessures → /injuries » **existe déjà** dans la sidebar
  (`Sidebar.tsx:162`) et la bottom-bar mobile (`MobileTabBar.tsx:37`). Rien à ajouter.
- **`useTrainingLoad`** : **n'existe pas** (`src/hooks` n'a aucun hook de charge). Donc
  l'**indice de risque** et la **corrélation blessure × charge** ne sont pas branchables
  en V1 → carte risque affichée « Indisponible », module charge en état honnête.
- **Migrations** : dossier `supabase/migrations` vide → schéma proposé ajouté
  (`PROPOSED_blessures.sql`, **NON appliqué**).

## Phase 0bis — Schéma proposé (NON appliqué)
`supabase/migrations/PROPOSED_blessures.sql` : tables `injuries` + `injury_logs`
(colonnes exactement comme spécifié : severity/zone/side/structure/precision/
intensity_rest|effort/onset_date/mechanism/activity/evolution/description/phase/
return_estimate_date/status/resolved_date/practitioner/next_appointment/rehab(jsonb)/
impact(jsonb)) + index + **RLS par propriétaire**. À relire et exécuter par l'humain.

## Phase 1 — Types & accès (réalisé)
- `types.ts` : `Injury`, `InjuryLog`, enums, `SEV` (couleur via tokens de charge :
  gene→`--charge-low`, douleur→`--charge-mid`, blessure→`--charge-hard`), `PHASES`.
- `useInjuries.ts` : hook typé (aucun any) load/add/update/resolve/addLog. **Zéro mock** :
  si la table n'existe pas (migration non appliquée), `tableMissing=true` → la page
  affiche un état « base à initialiser » propre.
- `lib.ts` : calculs dérivés réels (depuis N j, durée d'indispo, classements zones/sports,
  récidive, disponibilité 12 mois, stats 12 mois).

## Phase 2 — UI (réalisé, V1)
Patrons : sévérité en **touche** (point/filet 3px/tag), chiffres neutres tabulaires,
barres animées (`AnimatedBar`, respecte reduced-motion), feuilles via `createPortal`
(`Sheet.tsx`), SVG brut.
- **Aperçu** (`OverviewTab`) : 3 stats (Disponibilité, Risque [indisponible V1], Dispo
  12 mois) ; liste « En cours » (filet sévérité, intensité repos+effort, depuis N j,
  phase + barre) → ouvre Suivi ; **Check-in du jour** (repos/effort → `injury_log`).
- **Historique** (`HistoryTab`) : **frise SVG** toutes années (points par date sur 3
  bandes, couleur=sévérité, taille=durée, tooltip natif, cliquable) ; classements
  zones/sports (barres neutres) ; résolus (durée + drapeau récidive).
- **Analyse** (`AnalysisTab`) : stats 12 mois réelles ; corrélation charge en état
  « indisponible » honnête (pas de `useTrainingLoad`).
- **Feuille Signaler** (`ReportSheet`) : sévérité segmentée, zone/côté/structure/précision,
  sliders 0-10, date → « ≈ N j », mécanisme, activité, évolution, description.
- **Feuille Suivi** (`TrackSheet`) : stepper de phases (édite la phase), courbe de douleur
  (repos vs effort depuis les logs), impact (affiché), rééducation (exos cochables),
  notes médicales (affichées), journal + ajout de note, **marquer résolu**.

## V1 / différé (documenté)
- **Différé V1.5** (schéma + affichage prêts, édition à câbler) : éditer l'**impact**
  (à éviter/OK par sport), **ajouter des exos** de rééducation, éditer **notes médicales**
  (praticien, RDV) et **date de retour estimée** depuis la feuille Suivi.
- **V2** : indice de risque + corrélation charge (dès que `useTrainingLoad` existe),
  déduction zone×sport, prédiction de retour, corps 3D.

## Phase 3 — Garde-fou
Les 10 fichiers de la page sont ajoutés à `ENFORCED_PATHS`. Nav déjà en place.
Vérifié : enforce **0 couleur en dur (28 fichiers)**, `npm run build` OK, route `/injuries`
compilée. **Migration NON appliquée** (à exécuter par l'humain). Commit local, pas de push.
