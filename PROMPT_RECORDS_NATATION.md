# PROMPT — Refonte Records / Natation

> Application du Design System (`docs/DESIGN_SYSTEM.md`) à la vue Records/Natation
> + sa feuille « Modifier un record ». App en mode sombre — tokens uniquement,
> jamais de couleur en dur. Tâche structurelle, pas du lint.
>
> **Contrainte de livraison : commit LOCAL. NE PAS PUSH. Aucun déploiement Vercel.**

## Cadre
Réutiliser les composants déjà neutralisés pour Vélo/Course (segmented controls,
jauges, feuille `RecordDrawer`). **Pas de radar de profil pour la natation.**

## Contenu
Distances : **100, 200, 400, 1000, 1500, 2000, 5000, 10000 m**.

1. **Pills période** (All Time / années) → segmented control neutre. Toggle M/F neutre.
2. **Jauges VERTICALES par distance** : hauteur = **niveau vs barème** de la distance
   (comparable entre distances), teinte natation (`#0ea5b7`) modérée, temps au-dessus,
   distance en dessous. Distance vide = barre à 0 + « — ». Remplissage animé au montage.
3. **Lignes détaillées + saisie** : une ligne par distance, jauge horizontale teintée
   natation modérée, temps, **vitesse /100m calculée auto**, PR, « Préc. », lien
   **Modifier**. Chiffres NEUTRES.

## Feuille « Modifier » — style Vélo
- createPortal, fond `var(--bg)`/`--bg-card`, en-tête neutre : tag « Natation »
  (point natation) + tag distance + « Modifier le record » + date + ✕. Aucun bandeau coloré.
- Champ **Temps** ; **vitesse /100m en texte neutre** (« → 1:24 /100m », calculée).
- Champs arrondis, unité intégrée, focus `var(--primary)` + halo `var(--primary-dim)`.
- Bouton **« Enregistrer ce record » en `var(--primary)`** (cyan). Aucun jaune.

## Checklist (cochée avant commit)
- [x] **Pills/toggles neutres** : pills période (All Time / années) → nouveau
      `Segmented` neutre (`src/components/ui/Segmented.tsx`, piste `--bg-card2`,
      segment actif élevé `--bg-elev`). Toggle M/F natation → même `Segmented` neutre.
      Réserve : le sélecteur de sport global (`SportTabs`, fond actif coloré) n'est
      PAS dans le périmètre « pills période » et reste tel quel (à traiter séparément).
- [x] **Jauges verticales par distance** (`SwimRecords.tsx`) : 8 barres (100→10000 m),
      hauteur = niveau 0–10 vs barème natation par distance (genré H/F), comparable
      entre distances, teinte natation `#0ea5b7` modérée, temps au-dessus, distance
      en dessous, distance vide = barre à 0 + « — ». Remplissage animé au montage (0,9 s).
- [x] **Lignes détaillées** : une ligne/distance, jauge horizontale (niveau, teinte
      natation modérée), temps, **vitesse /100m calculée auto**, PR, « Préc. », lien
      **Modifier**. Tous les chiffres en tokens neutres (`var(--text)` tabulaire).
- [x] **Pas de radar** : `SwimRecords` n'en rend aucun.
- [x] **Feuille Modifier style Vélo** : réutilise `RecordDrawer` (createPortal, déjà
      neutralisé) — en-tête neutre + point sport natation, champ Temps, allure
      « → … /100m » en texte neutre auto, champs arrondis + focus `var(--primary)`,
      bouton « Enregistrer ce record » en `var(--primary)`. Aucun jaune.

Le barème natation (allures de référence s/100m par distance, H/F) est défini en
constantes sanctionnées dans `SwimRecords.tsx` — aucune migration ni schéma touché.

## Contraintes
TypeScript strict, aucun `any`. Aucune migration/schéma. Ne pas toucher `strava.ts`.
Max 200 lignes/fichier. Couleurs via `var()`. `npm run build` doit passer. Aucun emoji.
Zéro mock. **Commit local. NE PAS PUSH. Aucun déploiement Vercel.**
