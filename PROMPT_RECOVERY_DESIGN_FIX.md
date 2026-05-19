# Récupération — Corrections esthétiques et sommeil

## 1. Supprimer tous les emojis
Chercher et supprimer TOUS les emojis de la page Récupération :
- 🌙 (lune dans section sommeil)
- ✨ (dans les messages "tendances à débloquer")  
- 🔥 (streak check-ins)
- 💗 (cartes physiologie HRV, FC repos)
- 💧 (SpO2)
- 🌡 (température)
- ✓ (checkmark douleurs)
- Tout autre emoji présent

Remplacer par rien ou par des icônes SVG simples et monochromes
(Lucide icons ou heroicons déjà dans le projet).
Les cartes physiologie : icône simple outline gris, pas d'emoji rose.

## 2. Supprimer le bonhomme 2D (zones de douleur)
Supprimer complètement la silhouette SVG du corps humain.

Remplacer par un sélecteur de zones sous forme de grille de boutons :
- 4 colonnes × 4 lignes de boutons-pill cliquables
- Zones : Tête / Cou / Épaule G / Épaule D / Bras G / Bras D / 
  Dos haut / Poitrine / Dos bas / Abdomen / Hanche G / Hanche D / 
  Cuisse G / Cuisse D / Genou G / Genou D / Mollet G / Mollet D / 
  Pied G / Pied D
- Au repos : fond gris très clair, texte gris, border-radius 8px
- Sélectionné : fond rouge pâle, bordure rouge, texte rouge
- Plusieurs zones sélectionnables en même temps
- Sous la grille : "X zone(s) signalée(s) aujourd'hui" ou 
  "Aucune douleur aujourd'hui"

## 3. Section Sommeil — ajouter l'hypnogramme (préparé pour device)
S'inspirer du graphique Polar (image fournie).

### Sans device connecté (état actuel)
Garder les deux cartes "Durée estimée" et "Qualité ressentie"
mais améliorer le style :
- Supprimer l'emoji lune
- Icône SVG lune/étoile outline gris à la place
- Cartes avec fond blanc, bordure fine, border-radius 12px

### Avec device connecté (futur — préparer le composant)
Créer le composant `SleepHypnogram.tsx` dans les composants 
de la page recovery. Il sera activé quand des données device 
arriveront. Pour l'instant il est conditionné à une variable 
`hasDeviceSleepData = false`.

Structure du composant (même look que Polar) :

**En haut : 4 pills avec durée par phase :**
- Léger (bleu clair) : ex "4h01"
- Profond (bleu foncé) : ex "1h02"  
- REM (vert) : ex "55min"
- Interruptions (orange) : ex "28min"

**Graphique hypnogramme :**
- Axe X : temps (heure coucher → heure lever)
- Axe Y : 4 niveaux (Interruption en haut, Léger, REM, Profond en bas)
- Barres horizontales colorées empilées montrant les phases 
  dans le temps (exactement comme le graphe Polar)
- Couleurs : Léger = #60A5FA, Profond = #1D4ED8, 
  REM = #34D399, Interruption = #F97316
- Hover sur une phase : tooltip avec l'heure début/fin + durée

**Sous le graphique : barre résumé**
Barre horizontale pleine largeur montrant la répartition 
des phases (même couleurs), avec heure coucher à gauche 
et heure lever à droite.

**Info complémentaire :**
- Cycles de sommeil : "3 cycles"
- Score de sommeil : cercle /100

Pour l'instant : afficher le composant en mode demo avec des 
données statiques ET un badge "Aperçu — connecte Polar, 
Garmin ou Oura pour tes données réelles" en overlay semi-transparent.
Cela montre à l'utilisateur ce qu'il pourrait voir s'il connecte 
un device.

## 4. Améliorations esthétiques générales

### Cartes physiologie (HRV, FC repos, SpO2, Température)
- Supprimer les emojis roses
- Icônes SVG outline monochromes (gris moyen)
- HRV : icône activité/pulse
- FC repos : icône cœur outline
- SpO2 : icône poumon ou goutte
- Température : icône thermomètre
- Style cartes : fond blanc, bordure fine #E5E7EB, 
  border-radius 12px, padding 20px, hover léger shadow

### Section "Tendances à débloquer"
- Supprimer l'emoji ✨
- Texte simple sans emoji : "Tendances" comme titre,
  message en dessous
- Icône chart/graph SVG gris au lieu de l'emoji

### Volume hebdomadaire
- Le graphique est vide/cassé (juste un rectangle orange)
- Vérifier que les données Strava sont bien récupérées
- S'assurer que les barres s'affichent avec les bonnes hauteurs
- Format axe Y : heures:minutes

### Résumé semaine
- "0min" pour volume → afficher "—" si pas de données
- "— Séances" → afficher "0 séances" ou "—"
- Cohérence typographique des valeurs
