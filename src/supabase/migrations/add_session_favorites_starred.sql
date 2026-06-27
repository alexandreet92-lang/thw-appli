-- Étoile « séance préférée » sur les séances en réserve (Builder).
-- Permet à l'athlète de mettre en avant ses séances favorites parmi sa réserve
-- et de filtrer dessus. La table session_favorites EST la réserve du Builder.
ALTER TABLE public.session_favorites ADD COLUMN IF NOT EXISTS starred boolean NOT NULL DEFAULT false;
