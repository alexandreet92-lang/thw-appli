-- Corrige la contrainte statut : 'archive' → 'refuse'
DO $$
DECLARE cname text;
BEGIN
  SELECT constraint_name INTO cname
  FROM information_schema.table_constraints
  WHERE table_name = 'athlete_questionnaires'
    AND constraint_type = 'CHECK'
    AND constraint_name ILIKE '%statut%';
  IF cname IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.athlete_questionnaires DROP CONSTRAINT ' || quote_ident(cname);
  END IF;
END;
$$;

ALTER TABLE public.athlete_questionnaires
  ADD CONSTRAINT athlete_questionnaires_statut_check
    CHECK (statut IN ('nouveau', 'en_cours', 'accepte', 'refuse'));
