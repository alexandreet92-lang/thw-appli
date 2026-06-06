-- ════════════════════════════════════════════════════════════════
-- Catalogue de plats partagé (`dishes`)
-- Plats composés « basiques » (≈150) avec photo + macros, seedés une
-- fois depuis l'API Spoonacular (cf. scripts/seed-dishes.mjs). Sert de
-- source au sélecteur « Plats » du journal alimentaire.
--
-- Différence avec `foods` : un `dish` est un repas composé prêt à
-- logger (photo + portion par défaut), là où `foods` est un ingrédient
-- de référence générique.
-- ════════════════════════════════════════════════════════════════

-- Recherche floue (trigram) — l'extension existe déjà via add_food_library
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS dishes (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  spoonacular_id    integer UNIQUE,             -- id source ; null pour plat manuel/user
  name              text NOT NULL,
  category          text,                       -- meal type : breakfast | lunch | dinner | snack | dessert...
  cuisine           text,
  kcal_100g         numeric NOT NULL,
  prot_100g         numeric NOT NULL DEFAULT 0,
  gluc_100g         numeric NOT NULL DEFAULT 0,
  lip_100g          numeric NOT NULL DEFAULT 0,
  default_portion_g numeric NOT NULL DEFAULT 300,
  image_url         text,
  source            text NOT NULL DEFAULT 'spoonacular'
                      CHECK (source IN ('spoonacular','manual','user')),
  verified          boolean NOT NULL DEFAULT false,
  popularity        integer NOT NULL DEFAULT 0,
  created_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Index de recherche / tri
CREATE INDEX IF NOT EXISTS dishes_name_trgm  ON dishes USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS dishes_popularity ON dishes (popularity DESC);
CREATE INDEX IF NOT EXISTS dishes_category   ON dishes (category);

-- ────────────────────────────────────────────────────────────────
-- RLS : catalogue partagé (mêmes règles que `foods`)
--  • lecture : tout utilisateur authentifié
--  • insertion : plat non attribué (cache/seed) ou attribué à soi
--  • mise à jour : uniquement entrées non vérifiées
--  • suppression : interdite (aucune policy)
-- ────────────────────────────────────────────────────────────────
ALTER TABLE dishes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dishes readable by authenticated" ON dishes;
CREATE POLICY "dishes readable by authenticated"
  ON dishes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "dishes insertable by authenticated" ON dishes;
CREATE POLICY "dishes insertable by authenticated"
  ON dishes FOR INSERT TO authenticated
  WITH CHECK (created_by IS NULL OR created_by = auth.uid());

DROP POLICY IF EXISTS "dishes updatable when not verified" ON dishes;
CREATE POLICY "dishes updatable when not verified"
  ON dishes FOR UPDATE TO authenticated
  USING (verified = false) WITH CHECK (verified = false);

-- ────────────────────────────────────────────────────────────────
-- Recherche classée : préfixe > similarité trigram > popularité.
-- q = '' renvoie les plats les plus populaires (vue par défaut du picker).
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION search_dishes(q text, lim int DEFAULT 30)
RETURNS SETOF dishes
LANGUAGE sql STABLE
SET search_path = public, pg_catalog
AS $$
  SELECT *
  FROM dishes
  WHERE q = '' OR name ILIKE '%' || q || '%'
  ORDER BY
    (q <> '' AND name ILIKE q || '%') DESC,
    CASE WHEN q = '' THEN 0 ELSE similarity(name, q) END DESC,
    popularity DESC
  LIMIT lim;
$$;

GRANT EXECUTE ON FUNCTION search_dishes(text, int) TO authenticated;
