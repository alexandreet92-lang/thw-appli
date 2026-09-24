-- ══════════════════════════════════════════════════════════════════════════
-- Brique 1 — Déclenchement automatique de l'analyse IA après sync.
-- Stockage du résultat par activité (pas de recalcul à chaque ouverture) +
-- configuration par utilisateur (activation + niveau de détail).
-- Colonnes additives et nullables/à défaut → aucune donnée existante impactée.
-- ══════════════════════════════════════════════════════════════════════════

-- Résultat d'analyse stocké sur l'activité.
alter table public.activities
  add column if not exists ai_analysis        jsonb,
  -- null | 'pending' | 'done' | 'error' | 'skipped'
  add column if not exists ai_analysis_status text,
  add column if not exists ai_analysis_at     timestamptz;

-- Index pour que le cron retrouve vite les activités à analyser.
create index if not exists activities_ai_analysis_pending_idx
  on public.activities (ai_analysis_status, started_at desc)
  where ai_analysis_status = 'pending';

-- Configuration par utilisateur.
alter table public.profiles
  -- Auto-analyse activée pour cet utilisateur (kill-switch global : env AI_AUTO_ANALYZE).
  add column if not exists ai_auto_analyze   boolean not null default true,
  -- Niveau de détail : 'minimum' | 'advanced' | 'specialist'.
  add column if not exists ai_analysis_detail text not null default 'advanced';
