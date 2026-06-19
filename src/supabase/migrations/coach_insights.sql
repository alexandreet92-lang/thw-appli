-- ══════════════════════════════════════════════════════════════
-- COACH INSIGHTS — base de savoir INTER-utilisateurs du coach (phase 2)
--
-- Des enseignements distillés et anonymisés, validés manuellement, que
-- l'on réinjecte dans le system prompt du coach central (7ᵉ bloc).
-- C'est le réservoir qui rend le coach « meilleur avec l'échelle ».
--
-- Base PARTAGÉE (pas par utilisateur) : RLS activé SANS policy publique
-- → seul le service role lit/écrit. La donnée n'est jamais exposée au
-- client ; la lecture d'injection et la curation passent par le serveur.
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS coach_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sport TEXT,                                  -- running|cycling|hyrox|gym | NULL = tous sports
  topic TEXT NOT NULL,                         -- mots-clés de ciblage (ex: 'pma', 'récupération')
  insight_text TEXT NOT NULL,                  -- la leçon injectée
  source TEXT NOT NULL DEFAULT 'curated',      -- 'curated' (écrit humain) | 'mined' (auto, phase 3)
  status TEXT NOT NULL DEFAULT 'active'         -- 'candidate' | 'active' | 'retired'
    CHECK (status IN ('candidate', 'active', 'retired')),
  score INTEGER NOT NULL DEFAULT 0,            -- réputation (montera avec le feedback en phase 3)
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coach_insights_active ON coach_insights(status, sport);

ALTER TABLE coach_insights ENABLE ROW LEVEL SECURITY;
-- Aucune policy : RLS bloque tout accès client. Service role uniquement.
