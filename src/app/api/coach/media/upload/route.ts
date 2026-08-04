// ══════════════════════════════════════════════════════════════════════════
// POST /api/coach/media/upload — médias de la vitrine coach (photos + vidéo).
//
// GATING SERVEUR : réservé aux comptes ayant l'accès coach (owner / pack payant /
// essai coach). L'écriture passe par le service role vers le bucket coach-media ;
// aucun upload direct authenticated n'est autorisé.
// ══════════════════════════════════════════════════════════════════════════
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { COACH_OWNER_ID, COACH_TRIAL_DAYS } from '@/lib/coach/owner'

export const dynamic = 'force-dynamic'

const MAX_BYTES = 75 * 1024 * 1024 // 75 Mo (vidéo courte de présentation)
const EXT: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
  'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov',
}

async function hasCoachAccess(userId: string): Promise<boolean> {
  if (userId === COACH_OWNER_ID) return true
  const svc = createServiceClient()
  const { data } = await svc.from('profiles')
    .select('coach_subscribed, coach_trial_started_at').eq('id', userId).maybeSingle()
  if ((data as { coach_subscribed?: boolean } | null)?.coach_subscribed) return true
  const started = (data as { coach_trial_started_at?: string | null } | null)?.coach_trial_started_at
  return !!started && Date.now() - new Date(started).getTime() < COACH_TRIAL_DAYS * 86400000
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    if (!(await hasCoachAccess(user.id))) {
      return NextResponse.json({ error: 'Accès coach requis.', code: 'coach_required' }, { status: 403 })
    }

    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof Blob)) return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 })
    if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Fichier trop volumineux (max 75 Mo).' }, { status: 413 })
    const ext = EXT[file.type]
    if (!ext) return NextResponse.json({ error: 'Type non autorisé (images ou vidéo mp4/webm/mov).' }, { status: 415 })

    const kind = file.type.startsWith('video/') ? 'video' : 'image'
    const path = `${user.id}/${kind}/${crypto.randomUUID()}.${ext}`

    const svc = createServiceClient()
    const buffer = Buffer.from(await file.arrayBuffer())
    const { error: upErr } = await svc.storage
      .from('coach-media')
      .upload(path, buffer, { contentType: file.type, upsert: false })
    if (upErr) {
      console.error('[coach/media/upload] upload error:', upErr)
      return NextResponse.json({ error: 'Upload impossible.' }, { status: 500 })
    }
    const { data: { publicUrl } } = svc.storage.from('coach-media').getPublicUrl(path)
    return NextResponse.json({ url: publicUrl, kind, size: file.size }, { status: 201 })
  } catch (e) {
    console.error('[coach/media/upload] error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
