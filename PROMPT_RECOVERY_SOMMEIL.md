# Récupération — Section Sommeil visuelle

## ⚠️ Contrainte
Max 200 lignes par fichier. Un composant par visualisation.
Animations obligatoires sur chaque élément.
Données conditionnelles : ne rien afficher si pas de données.
Format temps : toujours Xh Xmin, jamais de décimales.

---

## 1. Score de sommeil — anneau radial
Composant : SleepScoreRing.tsx
Grand anneau circulaire centré (200px diamètre).
5 arcs colorés = facteurs du score :
- Durée (bleu #3B82F6)
- Profondeur (indigo #4338CA)
- Continuité (violet #7C3AED)
- Régularité (cyan #06B6D4)
- Efficacité (vert #10B981)

Chaque arc = longueur proportionnelle à sa contribution.
Centre : score /100 (32px, bold) + badge texte.

Animation mount : arcs se dessinent un par un, 300ms chacun, sens horaire.

Sous l'anneau : 5 mini-jauges horizontales (label + valeur + barre).

Si pas de données device : calculer un score simplifié depuis 
le check-in (sleep_hours + sleep_quality uniquement).

## 2. Répartition des phases — barres empilées
Composant : SleepPhasesStack.tsx
Pour chaque nuit de la période : une barre horizontale pleine largeur.
Couleurs :
- Profond : #1E3A8A
- REM : #7C3AED
- Léger : #60A5FA
- Interruptions : #F97316

Dernière nuit en haut. Label gauche : date. Label droite : durée totale.
Hover : tooltip avec durée de la phase.
Animation : barres apparaissent du bas vers le haut, 100ms de délai.

Si pas de données phases (pas de device) : ne pas afficher ce composant.

## 3. Courbes de tendance sommeil
Composant : SleepTrends.tsx
Toggle : 1 sem | 2 sem | 4 sem

5 courbes avec toggle afficher/masquer chacune :
- Durée totale (bleu, trait épais 2px)
- Profond (indigo, pointillé)
- REM (violet, pointillé)
- Léger (bleu clair, pointillé)
- Interruptions (orange, pointillé)

Axe Y : heures:minutes. Axe X : dates.
Zone de fond vert pâle 7h-9h = "recommandé".

En haut à droite :
- "Moy. 7h12" (moyenne période)
- "↑ +8%" ou "↓ -12%" vs période précédente (vert/rouge)

Animation tracé progressif 1.5s.

Sans données device : afficher uniquement la courbe "Durée totale" 
depuis les check-ins (sleep_hours).

## 4. Dette de sommeil
Composant : SleepDebt.tsx
Carte compacte.
Valeur : heures de dette sur 7 jours glissants.
Calcul : somme(8h - heures dormies) sur 7 jours.

Jauge circulaire inversée :
- 0h dette : cercle vert plein
- 1-3h : orange, partiellement vidé
- 3h+ : rouge, très vidé

Animation : remplissage/vidage 1s au mount.

## 5. Régularité circadienne
Composant : CircadianClock.tsx
Horloge 24h (cercle, minuit en haut, midi en bas).
Pour chaque nuit des 7 derniers jours : arc coloré sur le cercle 
montrant la période de sommeil (ex: arc de 23h à 7h).
Arcs semi-transparents superposés.
Plus les arcs se chevauchent → régulier → vert.
Dispersés → irrégulier → orange.
Centre : score de régularité /10.

Animation : arcs apparaissent un par un, 200ms entre chaque.

Source : sleep_data (time_bed, time_wake) ou check-in si pas de device.

---

## Layout section Sommeil
Desktop (2 colonnes) :
- Gauche : Score anneau (1a) + Dette (1d)
- Droite : Régularité circadienne (1e)
- Pleine largeur dessous : Phases empilées (1b)
- Pleine largeur dessous : Courbes tendance (1c)

Mobile : tout en colonne, score en premier.
