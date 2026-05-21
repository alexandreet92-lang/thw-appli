# Nutrition — Repas de la journée (refonte)

## Objectif
Refonte complète de la section "Repas de la journée". Remplacer les textareas
par une grille de cartes interactives avec modal ajout.

---

## 1 — SCHÉMA DB

```sql
ALTER TABLE nutrition_logs
  ADD COLUMN IF NOT EXISTS meal_slot text,
  ADD COLUMN IF NOT EXISTS meal_name text,
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS ingredients jsonb,
  ADD COLUMN IF NOT EXISTS source text default 'manual';
```

---

## 2 — GRILLE DE CARTES

6 slots : breakfast | morning_snack | lunch | afternoon_snack | dinner | evening_snack
Desktop : 3 colonnes. Mobile : 2 colonnes.
Icônes SVG inline (pas d'emoji, pas lucide-react).
État vide : icone + label + bouton "+" cercle 40px centré.
État rempli : nom + macros + crayon édition + "+" second repas.

## 3 — MODAL (drawer mobile, modal desktop)

Animation slide-up + scale 220ms.
3 onglets : Manuel | Repas types | Photo IA.

### Manuel
Nom repas + liste ingrédients dynamique (Nom / Qte / Unité / ×).
Macros totaux : 4 steppers Kcal(+10) / Prot(+1) / Gluc(+1) / Lip(+1).
MacroDonuts apparaissent dès saisie.

### Repas types
Fetch meal_templates, filtre timing, au clic pré-remplit Manuel.

### Photo IA
Upload image → POST /api/analyze-meal-photo → résultat avec donuts + badge confiance.
"Utiliser ces valeurs" ou "Ajuster manuellement" (switch tab Manuel).

## 4 — RÉSUMÉ JOURNALIER
Barre totaux en temps réel au-dessus de la grille.

## 5 — API ROUTE
/api/analyze-meal-photo : Claude Haiku claude-haiku-4-5, retourne JSON macros.

## Règles
- MealModal.tsx < 200 lignes. Onglets < 150 lignes chacun. MacroDonuts.tsx < 80 lignes.
- SVG raw, zéro emoji, TypeScript strict, npm run build doit passer.
