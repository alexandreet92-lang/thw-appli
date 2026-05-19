# Récupération — Page complète

## ⚠️ Contrainte d'implémentation obligatoire
Scope très large. Décomposer en composants séparés dans :
app/(dashboard)/recovery/components/

Max 200 lignes par fichier. Créer un fichier par section :
1. RecoveryBanner.tsx
2. DailyScore.tsx
3. WeeklySummary.tsx
4. TrainingLoad.tsx (PMC, volume, zones, ACWR, monotonie)
5. SleepSection.tsx
6. RecoveryTrends.tsx
7. BodyTracking.tsx (poids, hydratation, douleurs)
8. PhysioSection.tsx (HRV, FC, SpO2 — futur, vide pour l'instant)
9. DataSources.tsx

Implémenter dans cet ordre. Valider le build après chaque fichier.

## Format temps — RÈGLE GLOBALE
Ne JAMAIS afficher "0.7h" ou "1.5h".
Toujours convertir en heures et minutes : "42min", "1h30", "3h20".
Appliquer partout sur la page.

## Animations — RÈGLE GLOBALE
Chaque graphique, courbe, barre, donut, sparkline DOIT avoir une 
animation au mount :
- Barres : hauteur 0 → valeur finale, ease-out, 800ms, délai progressif
- Courbes/lignes : tracé progressif de gauche à droite, 1.2s
- Donuts/cercles : progression de 0° → angle final, 1.2s, ease-out
- Sparklines : fade-in + tracé 600ms
- Chiffres : comptage de 0 → valeur, 800ms (effet compteur)
Utiliser CSS animations ou framer-motion si déjà dans le projet.

---

## STRUCTURE DE LA PAGE (de haut en bas)

---

### 1. RecoveryBanner.tsx — Bandeau incitation device
Position : tout en haut de la page, avant toute section.
Affiché UNIQUEMENT si aucun device (Garmin/Whoop/Oura) connecté.

Contenu : "Connecte un appareil de suivi (Garmin, Whoop, Oura) 
pour débloquer HRV, sommeil détaillé et FC repos."
Bouton "Voir les sources" → scroll vers section Sources en bas.
Bouton "×" pour fermer → sauvegarder fermeture dans localStorage,
ne plus réafficher tant que pas vidé.

Style : fond bleu très pâle, bordure gauche 3px bleu accent, 
padding 12px 16px, texte 13px.

---

### 2. DailyScore.tsx — État du jour
Position : première section principale.

**Layout :** deux colonnes (desktop), une colonne (mobile).

**Colonne gauche :**
- Cercle de score /100 (donut chart)
  - Animation : progression de 0 → score, 1.2s, ease-out
  - Couleur dynamique selon le score :
    0-40 rouge / 41-60 orange / 61-80 bleu / 81-100 vert
  - Chiffre au centre : animation compteur 0 → valeur
  - Badge sous le cercle : "Faible" / "Moyen" / "Correct" / "Bon" / "Excellent"
  - Sous le badge : texte descriptif court
    ("Récupération correcte. Intensité modérée possible.")
- Streak check-ins : "🔥 3 jours consécutifs" si ≥ 2 jours.
  Petit texte gris sous le score, discret.

**Colonne droite :**
- 3 cartes en ligne : FC REPOS / HRV / SOMMEIL
  - FC REPOS : "—" + "Garmin, Polar ou Whoop" (futur)
  - HRV : "—" + "Garmin, Whoop ou Oura" (futur)
  - SOMMEIL : valeur du check-in (ex: "6h30") + "Estimé via check-in"
- 5 barres métriques empilées : Fatigue / Énergie / Stress / 
  Motivation / Douleurs
  - Chaque barre : label à gauche, valeur /10 à droite
  - Barre avec coins arrondis 6px, léger dégradé horizontal
  - Animation de remplissage au mount : largeur 0 → valeur, 800ms,
    délai progressif (+100ms par barre)
  - Couleurs : Fatigue = rouge, Énergie = vert, Stress = rouge,
    Motivation = vert, Douleurs = rouge
  - Sous chaque barre : 7 mini-dots représentant les 7 derniers 
    check-ins (chaque dot = couleur selon valeur, vert/orange/rouge)
- Bouton "Modifier le check-in" en haut à droite

Si pas de check-in aujourd'hui : score "—", barres grises,
message "Fais ton check-in pour voir ton score", bouton CTA visible.

---

### 3. WeeklySummary.tsx — Résumé de la semaine
Position : sous État du jour.

Carte horizontale pleine largeur.
Titre : "RÉSUMÉ SEMAINE" en petit label gris.

4 métriques en ligne :
- Score moyen : cercle miniature (40px) + valeur 
- Meilleur jour : "Mercredi — 89/100"
- Volume : "5h20" (depuis Strava, format h:min)
- Séances : "4 séances"

Sous les métriques :
- Barre de comparaison vs semaine précédente :
  "↑ +8 pts score moyen" ou "↓ -2h volume"
  Vert si amélioration, rouge si régression.

---

### 4. TrainingLoad.tsx — Charge d'entraînement
Position : sous Résumé semaine. LA section la plus importante.

**4a. Graphique PMC (Performance Management Chart)**
Titre : "PERFORMANCE" / sous-titre "CTL · ATL · TSB"
Graphe en ligne sur 12 semaines (84 jours).
3 courbes :
- CTL (Chronic Training Load, bleu) : moyenne exponentielle 42 jours du TSS
- ATL (Acute Training Load, rouge) : moyenne exponentielle 7 jours du TSS
- TSB (Training Stress Balance, vert/rouge) : CTL - ATL
  Zone remplie : vert au-dessus de 0, rouge en-dessous de 0

Animation : les 3 courbes se tracent progressivement de gauche 
à droite, 1.5s, ease-out.
Hover : tooltip avec la date + valeurs CTL/ATL/TSB de ce jour.
Toggle de période : 6 sem / 12 sem / 6 mois

Données : calculer CTL/ATL/TSB depuis les TSS des activités Strava
stockées en Supabase. Formule exponentielle standard.
Si pas assez de données (< 14 jours) : afficher le graphique avec 
les données disponibles + message "Plus de données = courbe plus fiable"

**4b. Jauge ACWR (Acute:Chronic Workload Ratio)**
Sous le PMC, aligné à gauche.
Jauge horizontale avec 3 zones colorées :
- 0 — 0.8 : bleu clair "Sous-entraînement"
- 0.8 — 1.3 : vert "Zone optimale"
- 1.3 — 1.5 : orange "Attention"
- > 1.5 : rouge "Danger surcharge"
Aiguille/marker à la position actuelle.
Valeur affichée : "ACWR 1.12" par exemple.
Calcul : ATL semaine / ATL 4 semaines (ou TSS7 / TSS28).
Animation : aiguille qui se positionne, 800ms.

**4c. Volume hebdomadaire**
Titre : "Volume" avec toggle "8 sem / 16 sem"
Bar chart empilé par sport. Chaque barre = 1 semaine.
Couleurs par sport : Course orange, Vélo bleu, Natation cyan,
Muscu violet, Autre gris.
Axe Y : heures (format h:min).
Hover : détail par sport de la semaine.
Animation : barres qui montent de 0, 800ms, délai progressif.
Semaine actuelle : bordure ou fond légèrement différent.

**4d. Zones de la semaine**
Titre : "Répartition par zones — cette semaine"
Barres horizontales empilées. Zones Z1 à Z7.
Chaque barre = temps passé dans cette zone.
Couleurs : Z1 gris, Z2 bleu, Z3 vert, Z4 jaune, Z5 orange, 
Z6 rouge, Z7 violet.
Format temps : "2h15" pas de décimales.
Si données de puissance/FC pas disponibles : masquer cette section.

**4e. Monotonie & Strain**
Petit encart sous les zones.
- Monotonie = moyenne(TSS 7j) / écart-type(TSS 7j)
  Affichage : valeur + badge "Normale" (< 1.5) / "Élevée" (1.5-2) / 
  "Critique" (> 2)
- Strain = TSS total semaine × monotonie
  Affichage : valeur + badge couleur

---

### 5. SleepSection.tsx — Analyse du sommeil
Position : sous Charge d'entraînement.

**Sans device :**
- Deux cartes côte à côte :
  - "Durée estimée" : valeur du check-in (ex: "6h30") 
    + icône lune discrète
  - "Qualité ressentie" : valeur /10 + donut miniature animé
- Trend line sur 14 jours : qualité de sommeil auto-évaluée.
  Animation tracé 1s.
- Message : "Connecte Garmin ou Oura pour les phases de sommeil"

**Avec device (futur, code préparé mais conditionné) :**
- Hypnogramme (phases de sommeil dans le temps)
- Phases : Profond / REM / Léger (barre empilée horizontale colorée)
- Détails : Coucher, Lever, Latence, Réveils, Efficacité
- Trend 14 jours

---

### 6. RecoveryTrends.tsx — Tendances de récupération
Position : sous Sommeil.

Toggle : "14 jours" / "30 jours" / "90 jours"

**6a. Courbe du score de récupération**
Line chart large, bien visible.
Axe X : dates. Axe Y : 0-100.
Zones de fond colorées : 0-40 rouge pâle, 40-60 orange pâle, 
60-80 bleu pâle, 80-100 vert pâle.
Points cliquables : au clic → tooltip avec détail du check-in 
de ce jour.
Animation : tracé de la courbe 1.5s.

**6b. Sparklines par métrique**
6 petits graphiques en grille (3×2 desktop, 2×3 mobile) :
Score / Fatigue / Énergie / Stress / Motivation / Sommeil
Chaque sparkline :
- Valeur du jour (grande, colorée) + variation vs moyenne
- Mini graphe ligne sur la période sélectionnée
- Animation tracé 600ms avec délai progressif

**6c. Corrélation charge → récupération**
Scatter plot ou graphe à double axe :
- Axe 1 : TSS de la veille (barres)
- Axe 2 : score récup du lendemain (ligne)
Permet de visualiser l'impact de la charge sur la récupération.
14 derniers jours.
Animation : points qui apparaissent un par un, 50ms entre chaque.

Si < 3 check-ins : masquer toute la section, afficher :
"Continue tes check-ins quotidiens pour voir tes tendances 
(X/3 enregistrés)" dans un encart centré.

---

### 7. BodyTracking.tsx — Suivi corporel
Position : sous Tendances.

**7a. Poids**
Titre : "POIDS"
Input rapide : champ numérique + bouton "Enregistrer" 
(saisie en kg, un chiffre après la virgule).
Courbe de poids sur 30/90 jours.
Animation tracé 1s.
Table Supabase `body_weight` : id, user_id, date, weight_kg, created_at.

**7b. Hydratation**
Titre : "HYDRATATION"
Input rapide : sélection litres (0.5L / 1L / 1.5L / 2L / 2.5L / 3L+)
ou input libre en litres.
Visualisation : icône verre qui se remplit selon la valeur.
Historique : barres verticales sur 7 jours.
Animation : remplissage du verre 800ms.
Table Supabase `hydration` : id, user_id, date, liters, created_at.

**7c. Carte des douleurs**
Titre : "ZONES DE DOULEUR"
Silhouette du corps (SVG simple, vue de face).
Zones cliquables : tête, épaule G/D, bras G/D, thorax, 
abdomen, dos, hanche G/D, cuisse G/D, genou G/D, 
mollet G/D, pied G/D.
Au tap sur une zone : marque la zone en rouge + sauvegarde.
Historique : zones fréquemment touchées sur 30 jours 
→ heatmap sur la silhouette (plus c'est fréquent, plus c'est rouge).
Table Supabase `pain_log` : id, user_id, date, body_zone, 
intensity (1-10), created_at.

---

### 8. PhysioSection.tsx — Données physiologiques (futur)
Position : sous Suivi corporel.

Section préparée mais VIDE pour l'instant.
4 cartes en état vide, chacune avec icône + label + message :
- "HRV" — "Disponible avec Garmin, Whoop ou Oura"
- "FC repos" — "Disponible avec Garmin, Polar ou Whoop"
- "SpO2" — "Disponible avec Garmin ou Oura"
- "Température" — "Disponible avec Oura"

Quand device connecté (futur) : chaque carte affiche la valeur 
du jour + trend line 14 jours + variation.

---

### 9. DataSources.tsx — Sources de données
Position : tout en bas de la page.

Déjà existant. Garder tel quel.
S'assurer que les boutons "Connecter" affichent "Bientôt disponible" 
au clic (toast ou tooltip).

---

## Sections desktop : layout 2 colonnes
Sur desktop (≥ 1024px), certaines sections peuvent se mettre 
côte à côte pour optimiser l'espace :
- DailyScore (gauche) + WeeklySummary (droite) sur la même ligne
- SleepSection (gauche) + BodyTracking poids+hydratation (droite)
- Le PMC chart, Volume et RecoveryTrends restent pleine largeur
  (ils ont besoin de l'espace)

---

## Couleurs des graphiques — palette cohérente
- Score / positif : #3B8FD4 (bleu app)
- Énergie / Motivation : #10B981 (vert)
- Fatigue / Stress / Douleurs : #EF4444 (rouge)
- CTL : #3B8FD4 (bleu)
- ATL : #EF4444 (rouge)
- TSB positif : #10B981 (vert), négatif : #EF4444 (rouge)
- Sommeil : #8B5CF6 (violet)
- Poids : #6B7280 (gris)
- Hydratation : #06B6D4 (cyan)

---

## Empty states
Quand pas de données pour une section ou graphique :
- Pas de zone grise/vide moche
- Message engageant centré : texte explicatif + icône/illustration 
  légère en gris très clair
- Ex pour Tendances : "Continue tes check-ins pour voir tes tendances 
  apparaître ici ✨"
- Ex pour Poids : "Enregistre ton poids pour suivre ta progression"

---

## Responsive mobile
Toutes les sections en colonne unique.
Graphiques larges (PMC, Volume, Score trend) : scrollables 
horizontalement dans un container overflow-x: auto.
Sparklines et petites cartes : grille 2 colonnes sur mobile.
