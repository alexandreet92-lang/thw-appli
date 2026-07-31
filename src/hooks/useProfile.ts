'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { resolvePlanningUid, isCoachScoped } from '@/lib/planning/scope'

export interface Profile {
  id:         string
  full_name:  string | null
  avatar_url: string | null
  bio:        string | null
  birth_date: string | null
  height_cm:  number | null
  weight_kg:  number | null
  email:      string | null
}

export function useProfile() {
  const [profile,  setProfile]  = useState<Profile | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const supabase = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    const uid = await resolvePlanningUid(supabase)
    if (!uid) { setLoading(false); return }
    // E-mail : celui du compte connecté en interface athlète ; en scope coach on
    // ne fuite jamais l'e-mail du coach → on prend celui du profil athlète s'il existe.
    const ownEmail = isCoachScoped() ? null : (await supabase.auth.getUser()).data.user?.email ?? null

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .single()

    if (error && error.code !== 'PGRST116') setError(error.message)
    const email = (data as { email?: string | null } | null)?.email ?? ownEmail
    setProfile(data ? { ...data, email } : { id: uid, full_name: null, avatar_url: null, bio: null, birth_date: null, height_cm: null, weight_kg: null, email })
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const save = useCallback(async (updates: Partial<Omit<Profile, 'id' | 'email'>>) => {
    setSaving(true)
    setError(null)
    const uid = await resolvePlanningUid(supabase)
    if (!uid) { setSaving(false); return }

    const { error } = await supabase
      .from('profiles')
      .upsert({ id: uid, ...updates, updated_at: new Date().toISOString() })

    if (error) setError(error.message)
    else await load()
    setSaving(false)
  }, [load])

  const uploadAvatar = useCallback(async (file: File): Promise<string | null> => {
    const uid = await resolvePlanningUid(supabase)
    if (!uid) return null

    const ext  = file.name.split('.').pop()
    const path = `${uid}/avatar.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })

    if (uploadError) { setError(uploadError.message); return null }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    return data.publicUrl
  }, [])

  return { profile, loading, saving, error, save, uploadAvatar, reload: load }
}
