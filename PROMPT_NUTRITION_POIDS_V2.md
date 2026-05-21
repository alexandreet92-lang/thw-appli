# Nutrition — Poids & Composition V2

## Objectif
Refonte complète de la section "Poids & Composition" avec les améliorations
listées ci-dessous. Ne pas casser l'insertion/affichage qui fonctionne déjà.

---

## 1 — GRAPHIQUE : sélecteur de métrique unique

Supprimer les 3 courbes simultanées. Une seule courbe affichée à la fois.

### Sélecteur au-dessus du graphique
5 pills horizontales scrollables (overflow-x auto sur mobile) :
"Poids (kg)" | "Masse grasse (%)" | "Masse musc. (kg)" | "IMC" | "Age metab."

Actif : fond dégradé cyan->bleu, texte blanc, font-medium
Inactif : border border-border, bg transparent

La métrique sélectionnée détermine :
- La donnée affichée sur la courbe
- La couleur de la courbe et du gradient
  - Poids : #06B6D4 (cyan)
  - Masse grasse : #F97316 (orange)
  - Masse musculaire : #3B82F6 (bleu)
  - IMC : #8B5CF6 (violet)
  - Age metab. : #10B981 (vert)
- L'unité affichée sur l'axe Y et dans le tooltip

### Taille du graphique
- Height FIXE : 240px dans le wrapper
- SVG raw uniquement — zéro Recharts (cf CLAUDE.md)
- Scroll horizontal si > 12 points : wrapper overflow-x auto, largeur SVG = max(containerW, n*60)

### Dots
- Dots permanents r=4, fill blanc, stroke couleur courbe, strokeWidth 2
- Au hover : r=6, vertical rule, tooltip

### Badge tendance
Sous le sélecteur, à droite. Régression linéaire sur les 4 derniers points.
Ex: "- 0.3 kg/sem" vert si poids descend, rouge si monte.
Pour MG : inverse. Pas affiché si < 2 points.

### Ligne d'objectif
Si target_weight défini dans le profil : ReferenceLine horizontale pointillée #6B7280.

---

## 2 — EDITION DES MESURES EXISTANTES

Table scrollable max-h-64, colonnes : Date | Poids | MG% | MM kg | IMC | Actions
- Icône crayon : édition inline (cellules -> inputs, bouton valider/annuler SVG)
- Icône poubelle : confirmation inline sous la ligne ("Supprimer ?" + Oui/Non)
- Update Supabase + rafraîchissement immédiat

---

## 3 — FORMULAIRE : stepper cards

Chaque métrique = une ligne :
[Label] ............. [ - ] [ valeur ] [ + ]

- Incréments : Poids=0.1kg, MG=0.1%, MM=0.1kg, Age metab.=1 an
- Valeur vide par défaut
- Poids seul = suffisant pour activer le bouton save
- Bouton save : dégradé cyan->bleu, spinner SVG pendant loading, vert 1.5s après succès

---

## 4 — NOUVELLES METRIQUES

### IMC
Calculé à la volée : weight_kg / (height_m)^2
Récupérer height_cm depuis table profiles.
Pill IMC désactivée si height_cm absent.

### Age métabolique
Champ metabolic_age integer dans body_measurements.
Saisie manuelle (balance connectée) ou estimation Mifflin-St Jeor.
Mention "(estimation indicative)" si calculé.

---

## 5 — MIGRATION SQL

```sql
ALTER TABLE body_measurements
  ADD COLUMN IF NOT EXISTS metabolic_age integer,
  ADD COLUMN IF NOT EXISTS notes text;
```

---

## Règles
- SVG raw uniquement — zéro recharts, chart.js, etc.
- WeightChart.tsx < 220 lignes (logique de calcul dans useBodyMetrics.ts)
- TypeScript strict, pas de any
- npm run build doit passer
- Aucun emoji dans l'interface
- Ne pas toucher aux autres sections Nutrition
