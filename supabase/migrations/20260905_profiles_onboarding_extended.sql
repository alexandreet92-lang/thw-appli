-- ═══════════════════════════════════════════════════════════════════
-- 20260905_profiles_onboarding_extended.sql
-- Questionnaire d'onboarding /bienvenue enrichi et à branches
-- (Athlète / Athlète-coach / Coach, versions complète & express).
--
-- On CONSERVE les colonnes existantes (primary_goal, sports, weekly_volume,
-- level, profile_setup_done) pour la rétrocompatibilité (dashboard, etc.) et
-- on ajoute :
--   • profile_type — le profil choisi au 1er écran
--   • onboarding   — jsonb portant TOUTES les réponses détaillées (par sport,
--                    objectifs échelonnés, réponses coach, « Autre » libres…).
-- Aucune donnée existante n'est modifiée.
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_type text
    CHECK (profile_type IN ('athlete', 'coach', 'both')),
  ADD COLUMN IF NOT EXISTS onboarding jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.profiles.profile_type IS
  'Profil choisi à l''onboarding : athlete | coach | both.';
COMMENT ON COLUMN public.profiles.onboarding IS
  'Réponses détaillées du questionnaire /bienvenue (version, par-sport, objectifs 3m/6m/1an/10ans, réponses coach, champs « Autre »).';
