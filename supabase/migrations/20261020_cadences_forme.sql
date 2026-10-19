-- ═════════════════════════════════════════════════════════════════
-- TEST DE FORME — nouvelle batterie Decaform (test_key = 'forme', 100 points : 50 navette + 50 circuit)
-- + table des courbes de fréquence cardiaque (facultatives, une par épreuve).
-- Idempotente. Ne touche aucune donnée existante. À coller dans le SQL Editor Supabase.
-- Nécessite 20261010_cadences_multitest.sql (colonne test_key) déjà appliquée.
-- ═════════════════════════════════════════════════════════════════

-- 1. Barème actif de la batterie « forme » (v1.0, barème PROVISOIRE à calibrer sur des passages réels).
insert into public.cadences_scale_versions (test_key, label, config, is_active)
values ('forme', 'v1.0', $seed${"version":"v1.0","test_key":"forme","title":"Test de forme","population":"adultes 18-80 ans, tous niveaux","days":[{"day":1,"label":"Navette + circuit","rest":false}],"max_days":1,"total_points":100,"anchors":{"ref_pct":0.6,"max_pct":1},"age":{"min":18,"max":80,"bands":["18-20","21-25","26-35","36-40","41-45","46-50","51-55","56-60","61-65","66-70","71-75","76-80"],"pf":{"18-20":{"vitesse":1,"force":0.9,"puissance":1,"explosivite":1,"endurance":0.95,"vo2max":0.95,"coordination":1,"endurance_musculaire":0.95},"21-25":{"vitesse":1,"force":1,"puissance":1,"explosivite":1,"endurance":1,"vo2max":1,"coordination":1,"endurance_musculaire":1},"26-35":{"vitesse":1,"force":1,"puissance":1,"explosivite":1,"endurance":1,"vo2max":1,"coordination":1,"endurance_musculaire":1},"36-40":{"vitesse":0.95,"force":1,"puissance":0.93,"explosivite":0.9,"endurance":0.95,"vo2max":0.95,"coordination":0.95,"endurance_musculaire":0.95},"41-45":{"vitesse":0.9,"force":0.95,"puissance":0.87,"explosivite":0.83,"endurance":0.9,"vo2max":0.9,"coordination":0.9,"endurance_musculaire":0.9},"46-50":{"vitesse":0.84,"force":0.9,"puissance":0.8,"explosivite":0.75,"endurance":0.85,"vo2max":0.85,"coordination":0.84,"endurance_musculaire":0.85},"51-55":{"vitesse":0.78,"force":0.84,"puissance":0.73,"explosivite":0.67,"endurance":0.8,"vo2max":0.8,"coordination":0.78,"endurance_musculaire":0.8},"56-60":{"vitesse":0.72,"force":0.78,"puissance":0.66,"explosivite":0.59,"endurance":0.74,"vo2max":0.74,"coordination":0.72,"endurance_musculaire":0.74},"61-65":{"vitesse":0.64,"force":0.7,"puissance":0.58,"explosivite":0.5,"endurance":0.67,"vo2max":0.67,"coordination":0.64,"endurance_musculaire":0.67},"66-70":{"vitesse":0.56,"force":0.62,"puissance":0.5,"explosivite":0.41,"endurance":0.59,"vo2max":0.59,"coordination":0.56,"endurance_musculaire":0.59},"71-75":{"vitesse":0.46,"force":0.52,"puissance":0.4,"explosivite":0.32,"endurance":0.49,"vo2max":0.49,"coordination":0.46,"endurance_musculaire":0.49},"76-80":{"vitesse":0.36,"force":0.42,"puissance":0.3,"explosivite":0.24,"endurance":0.39,"vo2max":0.39,"coordination":0.36,"endurance_musculaire":0.39}}},"qualities":[{"key":"endurance","label":"Endurance"},{"key":"vo2max","label":"VO2max"},{"key":"force","label":"Force"},{"key":"endurance_musculaire","label":"Endurance musculaire"}],"levels":[{"min_pct":0,"label":"Sédentaire"},{"min_pct":0.2,"label":"Amateur"},{"min_pct":0.4,"label":"Confirmé"},{"min_pct":0.6,"label":"Référence"},{"min_pct":0.8,"label":"Élite"},{"min_pct":1,"label":"Phénomène"},{"min_pct":1.1,"label":"Extraterrestre"}],"tests":[{"slug":"forme_navette","group":"Course","name":"Navette 20 m (Léger)","unit":"paliers","direction":"higher_is_better","kind":"abs","pts_max":50,"male":{"ref":10,"max":18},"female":{"ref":8,"max":16},"weights":{"endurance":0.2,"vo2max":0.8,"force":0,"endurance_musculaire":0},"day":1,"order_in_day":1},{"slug":"forme_circuit","group":"Circuit","name":"Circuit au poids du corps x3 (temps)","unit":"s","direction":"lower_is_better","kind":"abs","pts_max":50,"male":{"ref":540,"max":345},"female":{"ref":600,"max":405},"weights":{"endurance":0.3,"vo2max":0,"force":0.2,"endurance_musculaire":0.5},"day":1,"order_in_day":2,"age_time_exponent":1.0}]}$seed$, true)
on conflict (test_key, label) do update set config = excluded.config, is_active = true;

-- 2. Courbes de fréquence cardiaque : samples = [[secondes, bpm], ...] ; summary = min / max / moyenne + détail par palier ou exercice.
create table if not exists public.cadences_hr_traces (
  campaign_id uuid not null references public.cadences_campaigns(id) on delete cascade,
  test_slug   text not null,
  user_id     uuid not null references auth.users(id) on delete cascade,
  samples     jsonb not null default '[]'::jsonb check (jsonb_typeof(samples) = 'array' and jsonb_array_length(samples) <= 4000),
  summary     jsonb not null default '{}'::jsonb check (jsonb_typeof(summary) = 'object'),
  created_at  timestamptz not null default now(),
  primary key (campaign_id, test_slug)
);

alter table public.cadences_hr_traces enable row level security;
drop policy if exists chr_sel on public.cadences_hr_traces;
drop policy if exists chr_ins on public.cadences_hr_traces;
drop policy if exists chr_upd on public.cadences_hr_traces;
drop policy if exists chr_del on public.cadences_hr_traces;
create policy chr_sel on public.cadences_hr_traces for select to authenticated using (user_id = auth.uid());
create policy chr_ins on public.cadences_hr_traces for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.cadences_campaigns c where c.id = campaign_id and c.user_id = auth.uid()));
create policy chr_upd on public.cadences_hr_traces for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy chr_del on public.cadences_hr_traces for delete to authenticated using (user_id = auth.uid());
