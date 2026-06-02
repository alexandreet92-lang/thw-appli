-- Préférence IA : recherche web pré-activée au démarrage de chaque conversation.
-- Ajoutée à la table de préférences existante user_settings (user_id UNIQUE, RLS déjà en place).
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS ai_web_search_default boolean NOT NULL DEFAULT false;
