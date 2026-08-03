-- ══════════════════════════════════════════════════════════════════════════
-- COMMUNAUTÉ — Pièces jointes des messages (Phase 1.5) : images + fichiers.
-- Appliqué sur thw-v2.
--
-- Colonne attachments jsonb : tableau d'objets {url,type,name,size}. Le body
-- peut être vide SI au moins une pièce jointe est présente.
--
-- Stockage : bucket public `community-media` (lecture publique via getPublicUrl).
-- L'ÉCRITURE ne passe QUE par la route serveur /api/community/upload (service
-- role) qui vérifie l'entitlement Premium+ (community_upload_files). Aucune policy
-- INSERT storage pour `authenticated` → pas d'upload direct : gating serveur, pas
-- seulement UI.
-- ══════════════════════════════════════════════════════════════════════════

alter table public.community_messages
  add column if not exists attachments jsonb not null default '[]'::jsonb;

alter table public.community_messages drop constraint if exists community_messages_body_check;
alter table public.community_messages alter column body set default '';
alter table public.community_messages
  add constraint community_messages_body_len check (length(body) <= 4000);
alter table public.community_messages
  add constraint community_messages_content_present
  check (length(body) >= 1 or jsonb_array_length(attachments) >= 1);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'community-media', 'community-media', true, 10485760,
  array['image/jpeg','image/png','image/webp','image/gif','application/pdf']
)
on conflict (id) do nothing;
