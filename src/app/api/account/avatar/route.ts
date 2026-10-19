// ══════════════════════════════════════════════════════════════
// POST /api/account/avatar  (multipart, champ « file »)
// Photo de profil depuis le site. Même bucket public « avatars » et même chemin
// ({user_id}/avatar.ext) que l'app → la photo est identique partout.
// ══════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
const MAX_BYTES = 3 * 1024 * 1024

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 })
  const ext = TYPES[file.type]
  if (!ext) return NextResponse.json({ error: 'Format non supporté (JPG, PNG ou WebP)' }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Image trop lourde (3 Mo maximum)' }, { status: 400 })

  const path = `${user.id}/avatar.${ext}`
  const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type })
  if (upErr) return NextResponse.json({ error: 'Envoi impossible' }, { status: 500 })

  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  const url = `${data.publicUrl}?v=${Date.now()}`
  const { error: dbErr } = await supabase.from('profiles').upsert({ id: user.id, avatar_url: url, updated_at: new Date().toISOString() })
  if (dbErr) return NextResponse.json({ error: 'Profil non mis à jour' }, { status: 500 })
  return NextResponse.json({ avatarUrl: url })
}
