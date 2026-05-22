# Nutrition — Section Poids & Composition

## Contexte
Page Nutrition existante. On améliore uniquement la section "Poids & Composition".
La donnée poids DOIT être centralisée : lire et écrire dans la table `body_measurements`
(ou son équivalent existant utilisé par les pages Récupération et Profil).
Avant tout, inspecter le schéma Supabase pour identifier où le poids est déjà stocké.

## Étape 0 — Audit
1. Chercher dans tous les fichiers de l'app les références à `weight`, `poids`, `body_weight`,
   `body_measurements`. Identifier la table Supabase utilisée.
2. Si plusieurs tables stockent le poids, choisir la plus complète et ne garder que celle-là.
3. Si la table n'a pas les colonnes `fat_mass_percent` et `muscle_mass_kg`, créer la migration SQL.

## Schéma attendu (table `body_measurements`)

```sql
id uuid primary key
user_id uuid references auth.users
measured_at date not null
weight_kg numeric(5,2)
fat_mass_percent numeric(4,2)
muscle_mass_kg numeric(5,2)
source text default 'manual' -- 'manual' | 'polar' | 'withings'
created_at timestamptz default now()
```

## Section UI à produire

### Graphique principal
- Composant Recharts `ComposedChart` avec 3 `Line` superposées
- Ligne 1 : poids (kg) — couleur cyan `#06B6D4`, épaisseur 2px
- Ligne 2 : masse musculaire (kg) — couleur `#3B82F6` (bleu), épaisseur 2px, strokeDasharray="4 2"
- Ligne 3 : masse grasse (%) — couleur `#F97316` (orange), épaisseur 2px, strokeDasharray="2 4"
- Axe Y gauche : poids et masse musculaire (kg)
- Axe Y droit : masse grasse (%)
- Axe X : dates, format "DD/MM"
- Tooltip custom : fond dark/light adaptatif, afficher les 3 valeurs + date complète
- Dot visible uniquement au hover (activeDot radius=5, stroke blanc 2px)
- Animation d'entrée : animationDuration={800} animationEasing="ease-out" sur chaque Line
- Pas de données : message centré "Aucune mesure enregistrée — ajoutez votre première mesure ci-dessous"

### Toggle période (au-dessus du graphique)
4 boutons pill : "3 mois" | "6 mois" | "1 an" | "5 ans"
Actif : fond dégradé cyan→bleu, texte blanc
Inactif : border 1px border-muted, fond transparent

### Formulaire "Ajouter une mesure"
- Titre section : "Ajouter une mesure" (text-sm font-medium text-muted-foreground)
- Layout 2 colonnes sur desktop, 1 colonne mobile
- Champ Date : input type="date", valeur défaut = aujourd'hui
- Champ Poids (kg) : input number, step="0.1", placeholder="78.5"
- Champ Masse grasse (%) : input number, step="0.1", placeholder="14.2"
- Champ Masse musculaire (kg) : input number, step="0.1", placeholder="62.1"
- Bouton "Sauvegarder la mesure" : pleine largeur, dégradé cyan→bleu, rounded-lg
- On submit : insérer dans body_measurements, rafraîchir le graphique sans reload de page
- Toast succès : "Mesure enregistrée"

### Dernière mesure (badge résumé)
Juste sous le titre de section, si des données existent :
3 petites pills en ligne : "XX.X kg" | "XX.X% MG" | "XX.X kg MM"
Texte secondaire sous les pills : "Dernière mesure : JJ/MM/AAAA"

## Règles
- Aucun emoji
- Format décimaux : toujours 1 décimale (toFixed(1))
- Dark mode : fond carte bg-card, texte text-foreground
- Le composant graphique doit être dans un fichier séparé < 200 lignes
- npm run build doit passer
- Zéro librairie de chart externe — SVG raw uniquement (cf CLAUDE.md)
