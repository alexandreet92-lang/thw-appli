-- ════════════════════════════════════════════════════════════════
-- Bibliothèque d'aliments partagée (`foods`)
-- Source principale : OpenFoodFacts (cache interne + seed), plus
-- aliments créés par les utilisateurs. Sert de base de référence à
-- l'algorithme et à l'IA nutrition pour composer/estimer les repas.
-- ════════════════════════════════════════════════════════════════

-- Recherche floue (trigram) sur le nom et la marque
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS foods (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  barcode       text UNIQUE,                 -- code OFF ; null pour aliment générique/manuel
  name          text NOT NULL,
  brand         text,
  category      text,
  kcal_100g     numeric NOT NULL,
  prot_100g     numeric NOT NULL DEFAULT 0,
  gluc_100g     numeric NOT NULL DEFAULT 0,
  lip_100g      numeric NOT NULL DEFAULT 0,
  fibres_100g   numeric,
  sucres_100g   numeric,
  satures_100g  numeric,
  sodium_100g   numeric,
  image_url     text,
  source        text NOT NULL DEFAULT 'off'
                  CHECK (source IN ('off','ciqual','manual','user')),
  verified      boolean NOT NULL DEFAULT false,
  popularity    integer NOT NULL DEFAULT 0,
  created_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Index de recherche
CREATE INDEX IF NOT EXISTS foods_name_trgm   ON foods USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS foods_brand_trgm  ON foods USING gin (brand gin_trgm_ops);
CREATE INDEX IF NOT EXISTS foods_popularity  ON foods (popularity DESC);

-- ────────────────────────────────────────────────────────────────
-- RLS : la bibliothèque est partagée.
--  • lecture : tout utilisateur authentifié
--  • insertion : tout utilisateur authentifié (cache OFF + créations)
--  • mise à jour : uniquement sur les entrées non vérifiées
--    (protège les aliments curatés `verified = true` du vandalisme)
--  • suppression : interdite (aucune policy)
-- ────────────────────────────────────────────────────────────────
ALTER TABLE foods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "foods readable by authenticated"
  ON foods FOR SELECT TO authenticated USING (true);

-- Un utilisateur ne peut insérer qu'un aliment non attribué (cache OFF)
-- ou attribué à lui-même (création perso) — jamais au nom d'autrui.
CREATE POLICY "foods insertable by authenticated"
  ON foods FOR INSERT TO authenticated
  WITH CHECK (created_by IS NULL OR created_by = auth.uid());

CREATE POLICY "foods updatable when not verified"
  ON foods FOR UPDATE TO authenticated
  USING (verified = false) WITH CHECK (verified = false);

-- ────────────────────────────────────────────────────────────────
-- Recherche classée : préfixe > similarité trigram > popularité
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION search_foods(q text, lim int DEFAULT 20)
RETURNS SETOF foods
LANGUAGE sql STABLE
SET search_path = public, pg_catalog
AS $$
  SELECT *
  FROM foods
  WHERE name ILIKE '%' || q || '%' OR brand ILIKE '%' || q || '%'
  ORDER BY
    (name ILIKE q || '%') DESC,
    similarity(name, q) DESC,
    popularity DESC
  LIMIT lim;
$$;

GRANT EXECUTE ON FUNCTION search_foods(text, int) TO authenticated;
