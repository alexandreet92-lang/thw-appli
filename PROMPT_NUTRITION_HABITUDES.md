# Nutrition — Section Habitudes

## Schéma Supabase — nouvelle table

```sql
CREATE TABLE nutrition_habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  habit_type text not null, -- 'regular_meal' | 'training_fuel'
  name text not null, -- ex: "Mon petit-déjeuner type", "Gel SiS Beta"
  ingredients jsonb, -- [{name, quantity_g, calories, protein_g, carbs_g, fat_g}]
  total_calories integer,
  total_carbs_g numeric(6,2),
  total_protein_g numeric(6,2),
  created_at timestamptz default now()
);
```

## Section UI — "Mes habitudes"

### Sous-section "Repas réguliers"
Titre + bouton "+ Ajouter" (outline)
Liste de cartes compactes (1 par ligne) :
- Icône type repas (SVG) + Nom + résumé macros (text-xs muted)
- Bouton "Utiliser" à droite : futur hook vers journal quotidien (pour l'instant = toast "Fonctionnalité à venir")
- Icône poubelle : supprimer avec confirmation inline (pas de modal, juste confirmation texte sous la carte)

Modal création repas régulier :
- Nom du repas (ex: "Mon petit-déjeuner type")
- Liste ingrédients dynamique : Nom + Quantité(g) + Kcal + Prot + Gluc + Lip
- Totaux calculés automatiquement en bas du formulaire en temps réel

### Sous-section "Nutrition à l'effort"
Titre + bouton "+ Ajouter un produit"
Table ou liste de produits :
Colonnes : Nom | Grammage (g) | Glucides (g) | Protéines (g) | Kcal
Chaque ligne éditable inline (clic sur valeur → input, Enter pour valider)
Bouton suppression à droite de chaque ligne

## Règles
- Calcul des totaux côté client en temps réel (pas de requête DB pour ça)
- Aucun emoji
- npm run build doit passer
