'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') setError(error.message)
    setProfile(data ? { ...data, email: user.email ?? null } : { id: user.id, full_name: null, avatar_url: null, bio: null, birth_date: null, height_cm: null, weight_kg: null, email: user.email ?? null })
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const save = useCallback(async (updates: Partial<Omit<Profile, 'id' | 'email'>>) => {
    setSaving(true)
    setError(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, ...updates, updated_at: new Date().toISOString() })

    if (error) setError(error.message)
    else await load()
    setSaving(false)
  }, [load])

  const uploadAvatar = useCallback(async (file: File): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const ext  = file.name.split('.').pop()
    const path = `${user.id}/avatar.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })

    if (uploadError) { setError(uploadError.message); return null }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    return data.publicUrl
  }, [])

  return { profile, loading, saving, error, save, uploadAvatar, reload: load }
}
