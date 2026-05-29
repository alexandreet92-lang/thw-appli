# PROMPT_ANALYSE_FIXES — Correctifs page Analyse

## Fichier concerné
src/app/activities/page.tsx

---

## PARTIE 1 — SOURCES DE DONNÉES : utiliser les champs Strava stockés

RÈGLE : toujours lire le champ Strava stocké dans activities en premier.
N'utiliser le calcul depuis stream QUE si le champ est absent.

Champs à vérifier / corriger :
- Watts moyens → activity.avg_watts
- Watts normalisés → activity.normalized_watts (fallback stream)
- Cadence moyenne → activity.avg_cadence
- Cadence max → activity.max_cadence ?? max(streams.cadence)
- Puissance max → activity.max_watts ?? max(streams.watts)  ← AJOUTER l'affichage
- FC moyenne → activity.avg_hr
- FC max → activity.max_hr (NE PAS dupliquer)

FC moy et FC max doivent apparaître UNE SEULE FOIS dans BLOC 4 (Cardio).
→ Retirer FC moy/FC max de BLOC 2.
→ Dans BLOC 4 : FC max d'abord, FC moy juste en dessous.

---

## PARTIE 2 — CHAMPS MANQUANTS à ajouter

① FC moy. juste en dessous de FC max (BLOC 4)
② Variabilité VI = normalized_watts / avg_watts  → déjà présente, vérifier
③ Découplage P/FC : function calculateDecoupling(watts[], hr[])
   const ef1 = avg(watts[0..mid]) / avg(hr[0..mid])
   const ef2 = avg(watts[mid..n]) / avg(hr[mid..n])
   return ((ef1 - ef2) / ef1) * 100
   → utiliser a.aerobic_decoupling en premier, sinon calculer depuis streams
④ Température max → max(streams.temp)  → déjà présente, vérifier

---

## PARTIE 3 — COURBES VITESSE ET TEMPÉRATURE

Vitesse (km/h) et Température (°C) doivent figurer dans SyncCharts.
→ Déjà ajoutées dans ANALYSE_COMPLETE. Vérifier qu'elles sont bien présentes.

---

## PARTIE 4 — SYSTÈME DE HOVER : refonte complète

SUPPRIMER :
1. La barre en haut des courbes affichant "FC 142 bpm  186 W  89 rpm  126 m" au hover
2. Les valeurs sur le côté droit de chaque courbe (sync-right-val)

GARDER : colonne gauche Max/Moy permanente.

AJOUTER : tooltip unifié positionné AU NIVEAU DU CURSEUR.
- position absolute dans le container des courbes
- dark background rgba(15,23,42,0.92) + backdropFilter blur(8px)
- contient : temps écoulé + valeurs de chaque courbe présente
- flip gauche si cursorPct > 0.6

---

## PARTIE 5 — DÉCOUPLAGE : explication enrichie

Remplacer le texte explicatif actuel sous DecouplingChart par un bloc
avec cards colorées (vert/jaune/rouge) + paragraphe sur la chaleur.

---

## PARTIE 6 — DURÉE CUMULÉE PAR FC : explication enrichie

Remplacer le texte explicatif actuel sous HrCumulativeChart par un bloc
structuré avec explications lecture et seuil 90% FCmax.

---

## PARTIE 7 — COURBE MMP : corriger la courbe rouge

Problème : la courbe rouge affiche des valeurs impossibles (980W sur 24min).

Corrections :
- Filtre watts corrompus : si max(streams.watts) > 1200 pour une activité → ignorer
- console.log des 3 meilleures valeurs calculées
- Hauteur graphique ≥ 200px (déjà 220 — vérifier)

---

## VÉRIFICATION
1. Watts norm. = valeur Strava (pas stream calculé)
2. RPM moy. = valeur Strava (pas stream calculé)
3. FC moy. visible une seule fois sous FC max
4. FC max visible une seule fois
5. Variabilité, Découplage %, Temp. max présents
6. Courbes vitesse et température présentes
7. Top bar et valeurs droite supprimés
8. Tooltip au curseur avec toutes les valeurs
9. Courbe rouge MMP = valeurs plausibles (< 1200W filtrées)
10. Explications découplage et durée cumulée : blocs colorés visibles
