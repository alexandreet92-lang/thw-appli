-- activity_extras — données saisies manuellement par l'athlète, rattachées à
-- une activité :
--   - strength_log  : journal muscu { circuits, exos:[{name,sets,reps,load,rest}] }
--   - pool_length_m : longueur de bassin natation (pour estimer les longueurs)
-- Une ligne par activité (PK = activity_id). RLS user-scoped.
CREATE TABLE IF NOT EXISTS public.activity_extras (
  activity_id   uuid PRIMARY KEY REFERENCES public.activities(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  strength_log  jsonb,
  pool_length_m integer,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_extras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own activity_extras"
  ON public.activity_extras
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS activity_extras_user_idx ON public.activity_extras(user_id);
