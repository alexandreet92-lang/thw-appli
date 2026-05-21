# Nutrition — Section Repas Types

## Schéma Supabase — nouvelle table

```sql
CREATE TABLE meal_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  meal_timing text, -- 'pre_training' | 'post_training' | 'rest' | 'morning' | 'evening'
  photo_url text,
  calories integer,
  protein_g numeric(6,2),
  carbs_g numeric(6,2),
  fat_g numeric(6,2),
  ingredients jsonb, -- [{name, quantity, unit}]
  recommended_frequency_per_week integer,
  is_favorite boolean default false,
  source text default 'manual', -- 'manual' | 'ai'
  created_at timestamptz default now()
);
```

## Section UI

### Header section
Titre "Mes repas types" (text-xl font-semibold)
Bouton droit : "+ Créer un repas" (dégradé cyan→bleu, rounded-lg, padding sm)

### Filtres
Row pills : "Tous" | "Favoris" | "Pré-training" | "Post-training" | "Matin" | "Soir" | "Repos"
+ Bouton "Suggérer par l'IA" (outline, icône sparkle SVG custom, PAS d'emoji)

### Grille de repas
Layout : 2 colonnes desktop, 1 colonne mobile
Chaque carte repas :
- Fond bg-card border border-border rounded-xl overflow-hidden
- Zone photo : height 160px, bg-muted si pas de photo (icône assiette SVG centré)
  Si photo : object-cover Supabase Storage URL
- Body carte : padding 12px
  - Nom du repas : font-semibold text-sm
  - Badge timing : pill coloré (pré-training=cyan, post-training=bleu, matin=jaune pâle, soir=violet pâle, repos=vert pâle)
  - Macros en ligne : "XXX kcal · Prot. XXg · Gluc. XXg · Lip. XXg" (text-xs text-muted-foreground)
  - Fréquence : "X fois/semaine recommandé" (text-xs)
  - Icône étoile en haut à droite : remplie si favori, vide sinon — toggle au clic (update DB immédiat)

### Modal "Créer un repas" (pas de page séparée, modal overlay)
- Fond backdrop blur
- Formulaire scrollable max-height 80vh
- Champs : Nom, Timing (select), Upload photo, Kcal, Prot(g), Gluc(g), Lip(g), Fréquence/semaine
- Section ingrédients : liste dynamique avec bouton "+ Ajouter un ingrédient"
  Chaque ingrédient : input Nom + input Quantité + select Unité (g/ml/pièce)
- Bouton "Sauvegarder" + bouton "Annuler"
- Upload photo : vers Supabase Storage bucket meal-photos, stocker URL dans photo_url

## Règles
- Aucun emoji dans l'interface
- La feature "Suggérer par l'IA" : appeler l'agent Nutrition existant avec prompt
  "Suggère-moi 3 repas types adaptés à mon profil pour [timing sélectionné]"
  Ouvrir la conversation IA existante avec ce prompt pré-rempli (ne pas créer un nouveau système)
- npm run build doit passer
