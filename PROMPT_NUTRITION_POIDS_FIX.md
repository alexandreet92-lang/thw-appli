# Nutrition — Fix Poids & Graphique

## Objectif
Corriger le bug d'enregistrement/affichage des mesures de poids ET refaire
le graphique selon le design de référence fourni.

---

## ÉTAPE 1 — Debug prioritaire (avant tout changement UI)

1. Ouvrir le composant/page Nutrition et trouver la fonction de soumission
   du formulaire "Ajouter une mesure".

2. Vérifier les points suivants et corriger chaque problème trouvé :
   a. La table `body_measurements` existe bien dans Supabase — si non, créer
      la migration :

```sql
      CREATE TABLE IF NOT EXISTS body_measurements (
        id uuid primary key default gen_random_uuid(),
        user_id uuid references auth.users not null,
        measured_at date not null,
        weight_kg numeric(5,2),
        fat_mass_percent numeric(4,2),
        muscle_mass_kg numeric(5,2),
        source text default 'manual',
        created_at timestamptz default now()
      );
      ALTER TABLE body_measurements ENABLE ROW LEVEL SECURITY;
      CREATE POLICY "Users manage own measurements" ON body_measurements
        FOR ALL USING (auth.uid() = user_id);
```

   b. L'insertion inclut bien `user_id: session.user.id` — vérifier que la
      session est récupérée avant le submit.

   c. Après insertion réussie, le state local est rafraîchi (re-fetch ou
      ajout optimiste dans le tableau local). Si le rafraîchissement ne se
      fait pas, ajouter un appel `fetchMeasurements()` dans le `.then()`
      de l'insertion.

   d. Les valeurs du formulaire sont bien parsées en `parseFloat()` avant
      insertion — les inputs HTML renvoient des strings.

   e. Ajouter un `console.error` sur le catch de l'insertion et vérifier
      dans les logs Vercel/navigateur s'il y a une erreur silencieuse.

3. Tester en insérant une mesure fictive directement via Supabase Studio
   pour confirmer que la table existe et que le fetch fonctionne.

---

## ÉTAPE 2 — Refonte du graphique

Remplacer le graphique actuel par un AreaChart SVG raw avec le design suivant,
inspiré de l'image de référence (courbe lissée, aire remplie, labels sur points).

### Composant `WeightAreaChart.tsx` (nouveau fichier, max 200 lignes)

NOTE CRITIQUE : zéro librairie externe (cf CLAUDE.md). SVG raw uniquement.

**Courbe principale (poids)**
- Courbe lissée via bezier (path avec commandes C)
- Stroke : `#06B6D4` (cyan), strokeWidth 2.5
- Fill : dégradé vertical via `<defs><linearGradient>`
  - Stop 0% : `#06B6D4` opacity 0.35
  - Stop 100% : `#06B6D4` opacity 0.0
- Dot : cercle r=5, fill `#ffffff`, stroke `#06B6D4`, strokeWidth 2
- Label valeur au-dessus de chaque dot : fontSize 11, fill `#06B6D4`, fontWeight 600

**Axes**
- XAxis : format DD/MM, fontSize 11, couleur `var(--text-dim)`
- YAxis : domain auto (min-10, max+10), fontSize 11, couleur `var(--text-dim)`
- Grille horizontale pointillée : strokeDasharray "4 4", opacity 0.15

**Tooltip custom**
- Apparait au hover du point le plus proche
- Fond `var(--bg-card)`, border `var(--border)`, borderRadius 8, padding 8 12
- Affiche date + poids kg + MG% si dispo + MM kg si dispo

**Courbes secondaires (si données disponibles)**
- Masse grasse % : ligne pointillée `#3B82F6`, strokeDasharray="4 2", axe Y droit
- Masse musculaire kg : ligne pointillée `#F97316`, strokeDasharray="2 4"

**Cas "aucune donnée"**
Si `data.length === 0` : ne pas rendre le chart — afficher :
- Icône balance SVG simple, 40px, couleur var(--text-dim)
- "Aucune mesure enregistree"
- "Ajoutez votre premiere mesure ci-dessous"
Centré verticalement dans un div height 192px.

### Hauteur du chart
- Desktop : 280px
- Mobile : 200px

---

## ÉTAPE 3 — Dernier point obligatoire

Après sauvegarde d'une mesure, la date du formulaire doit se réinitialiser
à aujourd'hui et les autres champs se vider. Le graphique doit afficher
immédiatement le nouveau point sans reload.

npm run build doit passer avant le commit.

---

## Règles
- Aucun emoji dans l'interface
- SVG raw uniquement — zéro recharts, chart.js, etc.
- TypeScript strict — pas de `any`
- npm run build doit passer
