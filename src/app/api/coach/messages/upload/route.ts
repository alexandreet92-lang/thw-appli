// ══════════════════════════════════════════════════════════════════════════
// POST /api/coach/messages/upload — pièce jointe d'un message coach↔athlète.
//
// Bidirectionnel : coach OU athlète peut envoyer. Gating = être authentifié ET
// membre d'au moins un lien coach_athlete ACCEPTÉ (dans un sens ou l'autre).
// Types autorisés : images, parcours (GPX/TCX) et documents (PDF). Écriture par
// service role vers le bucket coach-media (préfixe messages/).
// ══════════════════════════════════════════════════════════════════════════
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MAX_BYTES = 25 * 1024 * 1024 // 25 Mo

// type MIME → { ext, kind }. kind classe l'affichage côté bulle.
const ALLOW: Record<string, { ext: string; kind: 'image' | 'parcours' | 'file' }> = {
  'image/jpeg': { ext: 'jpg', kind: 'image' },
  'image/png':  { ext: 'png', kind: 'image' },
  'image/webp': { ext: 'webp', kind: 'image' },
  'image/gif':  { ext: 'gif', kind: 'image' },
  'image/heic': { ext: 'heic', kind: 'image' },
  'application/pdf': { ext: 'pdf', kind: 'file' },
  'application/gpx+xml': { ext: 'gpx', kind: 'parcours' },
  'application/vnd.garmin.tcx+xml': { ext: 'tcx', kind: 'parcours' },
}

// Parcours souvent servis en text/xml ou application/octet-stream → on retombe
// sur l'extension du nom de fichier.
function classify(type: string, name: string): { ext: string; kind: 'image' | 'parcours' | 'file' } | null {
  if (ALLOW[type]) return ALLOW[type]
  const lower = name.toLowerCase()
  if (lower.endsWith('.gpx')) return { ext: 'gpx', kind: 'parcours' }
  if (lower.endsWith('.tcx')) return { ext: 'tcx', kind: 'parcours' }
  if (lower.endsWith('.pdf')) return { ext: 'pdf', kind: 'file' }
  return null
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    // Doit être partie prenante d'au moins un lien coach_athlete accepté.
    const svc = createServiceClient()
    const { data: rel } = await svc.from('coach_athlete')
      .select('id').eq('status', 'accepted')
      .or(`coach_id.eq.${user.id},athlete_id.eq.${user.id}`).limit(1)
    if (!rel || rel.length === 0) {
      return NextResponse.json({ error: 'Aucun lien coach/athlète actif.' }, { status: 403 })
    }

    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof Blob)) return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 })
    if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Fichier trop volumineux (max 25 Mo).' }, { status: 413 })
    const name = (form.get('name') as string) || 'fichier'
    const cls = classify(file.type, name)
    if (!cls) return NextResponse.json({ error: 'Type non autorisé (image, GPX/TCX ou PDF).' }, { status: 415 })

    const path = `messages/${user.id}/${crypto.randomUUID()}.${cls.ext}`
    const buffer = Buffer.from(await file.arrayBuffer())
    const { error: upErr } = await svc.storage.from('coach-media')
      .upload(path, buffer, { contentType: file.type || 'application/octet-stream', upsert: false })
    if (upErr) {
      console.error('[coach/messages/upload] upload error:', upErr)
      return NextResponse.json({ error: 'Upload impossible.' }, { status: 500 })
    }
    const { data: { publicUrl } } = svc.storage.from('coach-media').getPublicUrl(path)
    return NextResponse.json({ url: publicUrl, kind: cls.kind, name, size: file.size }, { status: 201 })
  } catch (e) {
    console.error('[coach/messages/upload] error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
