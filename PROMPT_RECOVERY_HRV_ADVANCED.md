# Récupération — HRV et indicateurs avancés

## ⚠️ Contrainte
Max 200 lignes par fichier. Un composant par visualisation.
Animations obligatoires. Données conditionnelles.
Format temps : Xh Xmin. Jamais de décimales.
Chaque section avec toggle de période affiche :
- Moyenne de la période
- % variation vs période précédente (vert si mieux, rouge si pire)

---

## 1. HRV du jour — valeur contextualisée
Composant : HrvDaily.tsx
Carte principale :
- Valeur HRV grande (36px, bold) : "65 ms"
- Flèche tendance ↑/↓ + variation vs moyenne 7j : "+7 ms"
- Barre de contexte horizontale en dessous :
  [min historique ←── zone basse | zone normale | zone haute ──→ max historique]
  Marker (triangle ou point) sur la position du jour.
  Zones colorées : rouge | jaune | vert | jaune | rouge

Si pas de données HRV : ne pas afficher.

## 2. Courbe HRV tendance
Composant : HrvTrend.tsx
Toggle : 1 sem | 2 sem | 4 sem
- Ligne principale : HRV quotidien (points + ligne)
- Ligne pointillée grise : moyenne mobile 7 jours
- Zone remplie vert pâle au-dessus de la moyenne personnelle
- Zone remplie rouge pâle en dessous
En haut à droite : "Moy. 62ms" + "↑ +5% vs préc."
Points cliquables : tooltip date + valeur.
Animation tracé 1.5s.

## 3. HRV heatmap hebdomadaire
Composant : HrvHeatmap.tsx
Grille 7 colonnes (L M M J V S D) × N lignes (semaines).
Chaque cellule = 1 jour. Couleur = valeur HRV.
Palette : Bas (#EF4444) → Moyen (#F59E0B) → Bon (#10B981) → Excellent (#059669)
Animation : cellules en cascade, 20ms entre chaque.

## 4. Cascade de récupération (waterfall)
Composant : RecoveryWaterfall.tsx
Barres horizontales depuis 0 :
- Sommeil : +X pts (vert vers droite)
- HRV ou Énergie : +X pts (violet vers droite)
- Stress : ±X pts
- Fatigue : ±X pts
- Charge J-1 (TSS) : -X pts (rouge vers gauche)
- Douleurs : -X pts ou 0
= Score total en bas

Animation : barres s'ajoutent une par une, 400ms entre chaque.

## 5. Temps de récupération estimé
Composant : RecoveryTimeline.tsx
Timeline horizontale avec courbe exponentielle.
Zones : rouge (non récupéré) → orange (partiel) → vert (récupéré).
Marker "Maintenant" + marker "Récupéré" estimé.
Calcul : TSS × 0.8 heures, ajusté par score de récupération.
Animation : courbe tracée gauche→droite, 2s.

## 6. Cercle de respiration
Composant : BreathingCircle.tsx
Cercle 120px animé : 4s inspire → 2s retenir → 6s expire.
Bouton "Démarrer" (ne pas démarrer auto).
Compteur de cycles.
Ne démarrer QU'AU clic utilisateur.

---

## Ordre layout page Récupération
1. Bandeau (RecoveryBanner)
2. Score jour + Résumé semaine
3. Cascade de récupération (RecoveryWaterfall)
4. Temps de récupération (RecoveryTimeline)
5. Charge d'entraînement (TrainingLoad)
6. Sommeil (SleepSection)
7. HRV (HrvSection)
8. Tendances check-in (RecoveryTrends)
9. Données physiologiques (PhysioSection)
10. Cercle de respiration (BreathingCircle)
11. Sources (DataSources)
