-- Policies RLS manquantes sur le bucket public "avatars".
-- Sans ces policies, l'upload de photo de profil échouait (RLS storage.objects).
-- Chaque utilisateur gère uniquement les fichiers de son propre dossier
-- (chemin : {user_id}/avatar.ext). Lecture publique (bucket public).

create policy "avatars_insert_own"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (auth.uid())::text);

create policy "avatars_update_own"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (auth.uid())::text);

create policy "avatars_delete_own"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (auth.uid())::text);

create policy "avatars_read_all"
  on storage.objects for select to public
  using (bucket_id = 'avatars');
