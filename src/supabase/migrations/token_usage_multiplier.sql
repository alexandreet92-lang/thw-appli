-- Pondération des tokens par modèle : on stocke le pondéré (tokens_used),
-- le réel API (raw_tokens) et le multiplicateur appliqué.
ALTER TABLE token_usage ADD COLUMN IF NOT EXISTS raw_tokens INTEGER;
ALTER TABLE token_usage ADD COLUMN IF NOT EXISTS multiplier INTEGER DEFAULT 1;
