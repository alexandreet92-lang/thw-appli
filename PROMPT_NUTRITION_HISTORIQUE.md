# Nutrition — Section Historique

## Contexte
Refonte de la section Historique existante sur la page Nutrition.
Conserver la logique de fetch existante, améliorer UI et ajouter les filtres + navigation.

## Structure de la section

### Contrôles (ligne 1)
Toggle période : 3 pills — "7 jours" | "2 semaines" | "4 semaines"

### Contrôles (ligne 2, visible uniquement en vue "7 jours")
Navigation semaine : bouton "<" | label "Semaine du JJ/MM au JJ/MM" | bouton ">"
- Naviguer jusqu'à 6 semaines en arrière, pas au-delà
- La semaine courante : bouton ">" désactivé (grisé)

### Filtres données
Row de pills sélectionnables (multi-select) :
"Kcal" | "Protéines" | "Glucides" | "Lipides" | "Macros complètes" | "Micros"
Par défaut : "Kcal" sélectionné
Actif : fond dégradé cyan→bleu, texte blanc
Inactif : border muted, fond transparent

### Résumé semaine (visible en vue "7 jours")
Grille 4 colonnes : Total Kcal | Total Protéines (g) | Total Glucides (g) | Total Lipides (g)
Chaque cellule : valeur en grand (text-2xl font-bold) + label dessous (text-xs text-muted-foreground)
Comparaison semaine précédente : badge coloré sous chaque valeur
  - Format : "+X%" en vert si augmentation vers l'objectif
  - "-X%" en rouge si régression
  - Logique amélioration : se rapprocher de l'objectif hebdo (si pas d'objectif, neutre)
  - Si pas de données semaine précédente : badge gris "—"

### Graphique Kcal
BarChart SVG raw : barres "Consommé" (cyan #06B6D4) + barres "Planifié" (var(--border))
Axes : X = jours (format "Lun\n14"), Y = kcal

### Graphique Macros (visible si filtre Macros/Protéines/Glucides/Lipides actif)
LineChart SVG raw : 3 courbes (Protéines #22C55E, Glucides #EAB308, Lipides #F97316)
Hover tooltip adaptatif avec date + valeurs

## Règles
- Composant graphique Kcal dans fichier séparé < 200 lignes
- Composant graphique Macros dans fichier séparé < 200 lignes
- Zéro librairie de chart externe — SVG raw uniquement (cf CLAUDE.md)
- Aucun emoji
- npm run build doit passer
