-- ═══════════════════════════════════════════════════════════════════
-- add_athlete_questionnaires.sql
-- Table athlete_questionnaires — Questionnaires d'inscription coaching
-- soumis depuis le site web externe. Lecture par le coach dans l'app.
-- ═══════════════════════════════════════════════════════════════════

-- ── Table ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.athlete_questionnaires (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),

  -- Statut de traitement par le coach
  statut       text        NOT NULL DEFAULT 'nouveau'
    CHECK (statut IN ('nouveau', 'en_cours', 'accepte', 'refuse')),
  notes_coach  text,

  -- ── Identité ────────────────────────────────────────────────────
  prenom       text        NOT NULL,
  nom          text        NOT NULL,
  email        text        NOT NULL,
  age          integer     CHECK (age > 0 AND age < 120),
  sexe         text        CHECK (sexe IN ('homme', 'femme', 'autre', 'non_precise')),

  -- ── Objectif principal ──────────────────────────────────────────
  objectif_sport   text,   -- running, cycling, hyrox, triathlon, trail…
  objectif_course  text,   -- nom de la course / épreuve
  objectif_date    date,
  objectif_temps   text,   -- format libre : "3h30", "sub-4h", etc.

  -- ── Autres courses de la saison ─────────────────────────────────
  -- [{nom, date, importance: "A"|"B"|"C", temps_vise}]
  autres_courses   jsonb   NOT NULL DEFAULT '[]'::jsonb,

  -- ── Mode de vie ─────────────────────────────────────────────────
  heures_par_semaine  integer CHECK (heures_par_semaine >= 0),
  jours_disponibles   jsonb  NOT NULL DEFAULT '[]'::jsonb,
  contraintes         text,  -- contraintes pro/perso
  blessures           text,

  -- ── Matériel ────────────────────────────────────────────────────
  montre_gps        boolean NOT NULL DEFAULT false,
  capteur_puissance boolean NOT NULL DEFAULT false,
  home_trainer      boolean NOT NULL DEFAULT false,
  salle_muscu       boolean NOT NULL DEFAULT false,
  strava_connecte   boolean NOT NULL DEFAULT false,

  -- ── Coaching choisi ─────────────────────────────────────────────
  coaching_type     text CHECK (coaching_type IN ('pack', 'abonnement')),
  coaching_duree    text,  -- "3 mois", "6 mois", "1 an"…
  coaching_sport    text,
  coaching_objectif text,

  -- ── Options ─────────────────────────────────────────────────────
  option_renfo  boolean NOT NULL DEFAULT false,
  niveau_suivi  text    CHECK (niveau_suivi IN ('essentiel', 'standard', 'premium')),

  -- ── Informations complémentaires ────────────────────────────────
  infos_complementaires text
);

-- ── Trigger updated_at ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_athlete_questionnaires_updated_at
  ON public.athlete_questionnaires;

CREATE TRIGGER trg_athlete_questionnaires_updated_at
  BEFORE UPDATE ON public.athlete_questionnaires
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Index ──────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_aq_created_at
  ON public.athlete_questionnaires (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_aq_statut
  ON public.athlete_questionnaires (statut);

CREATE INDEX IF NOT EXISTS idx_aq_email
  ON public.athlete_questionnaires (email);

-- ── RLS ────────────────────────────────────────────────────────────
ALTER TABLE public.athlete_questionnaires ENABLE ROW LEVEL SECURITY;

-- INSERT : ouvert au service role uniquement (via l'API route externe)
-- Aucune policy INSERT pour les utilisateurs — l'API route utilise
-- createServiceClient() qui bypasse RLS.

-- SELECT : tout utilisateur authentifié peut lire (coach connecté à l'app)
DROP POLICY IF EXISTS "aq_select_authenticated" ON public.athlete_questionnaires;
CREATE POLICY "aq_select_authenticated"
  ON public.athlete_questionnaires
  FOR SELECT
  TO authenticated
  USING (true);

-- UPDATE : tout utilisateur authentifié peut mettre à jour le statut / notes
DROP POLICY IF EXISTS "aq_update_authenticated" ON public.athlete_questionnaires;
CREATE POLICY "aq_update_authenticated"
  ON public.athlete_questionnaires
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── Commentaires ───────────────────────────────────────────────────
COMMENT ON TABLE  public.athlete_questionnaires IS
  'Questionnaires d''inscription coaching soumis depuis le site web externe.';
COMMENT ON COLUMN public.athlete_questionnaires.statut IS
  'nouveau → en_cours → accepte | archive';
COMMENT ON COLUMN public.athlete_questionnaires.autres_courses IS
  'Array JSON : [{nom, date, importance (A/B/C), temps_vise}]';
COMMENT ON COLUMN public.athlete_questionnaires.jours_disponibles IS
  'Array JSON : ["lundi", "mercredi", "samedi", ...]';
