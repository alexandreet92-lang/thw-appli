-- ═════════════════════════════════════════════════════════════════
-- CADENCES — accord parental sous 15 ans (RGPD art. 8, loi Informatique et Libertés art. 45).
-- Horodate l'accord d'un parent ou représentant légal sur les campagnes d'un enfant de moins de 15 ans.
-- Idempotente. NULL = pas concerné (15 ans ou plus) ou campagne antérieure à cette règle.
-- ═════════════════════════════════════════════════════════════════
alter table public.cadences_campaigns add column if not exists parental_consent_at timestamptz;
comment on column public.cadences_campaigns.parental_consent_at is 'Accord parental (moins de 15 ans) : date de l''attestation faite par le titulaire du compte.';
