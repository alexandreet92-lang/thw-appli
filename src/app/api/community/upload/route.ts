// ══════════════════════════════════════════════════════════════════════════
// POST /api/community/upload — envoi d'une pièce jointe (image/fichier).
//
// GATING SERVEUR (jamais seulement UI) : l'upload de médias est réservé aux tiers
// habilités (community_upload_files = Premium+). La source de vérité reste
// TIER_LIMITS via communityEntitlements. L'écriture dans le bucket passe par le
// service role : aucun upload direct authenticated n'est possible.
// ══════════════════════════════════════════════════════════════════════════
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getUserTier, isCreatorAccount } from '@/lib/subscriptions/check-quota'
import { communityEntitlements } from '@/lib/subscriptions/tier-limits'

export const dynamic = 'force-dynamic'

const MAX_BYTES = 10 * 1024 * 1024 // 10 Mo
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'])
const EXT: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'application/pdf': 'pdf',
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const unlimited = await isCreatorAccount(user.id)
    const tier = await getUserTier(user.id)
    const ent = communityEntitlements(tier, unlimited)
    if (!ent.canUploadFiles) {
      return NextResponse.json(
        { error: 'Passe Premium pour envoyer des photos et fichiers.', code: 'upgrade_required', upgrade_url: '/settings/subscription' },
        { status: 403 },
      )
    }

    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof Blob)) return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 })
    if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Fichier trop volumineux (max 10 Mo).' }, { status: 413 })
    if (!ALLOWED.has(file.type)) return NextResponse.json({ error: 'Type de fichier non autorisé.' }, { status: 415 })

    const rawName = (file instanceof File ? file.name : 'fichier') || 'fichier'
    const ext = EXT[file.type] ?? 'bin'
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`

    const svc = createServiceClient()
    const buffer = Buffer.from(await file.arrayBuffer())
    const { error: upErr } = await svc.storage
      .from('community-media')
      .upload(path, buffer, { contentType: file.type, upsert: false })
    if (upErr) {
      console.error('[community/upload] upload error:', upErr)
      return NextResponse.json({ error: 'Upload impossible.' }, { status: 500 })
    }
    const { data: { publicUrl } } = svc.storage.from('community-media').getPublicUrl(path)
    return NextResponse.json({ url: publicUrl, name: rawName.slice(0, 120), size: file.size }, { status: 201 })
  } catch (e) {
    console.error('[community/upload] error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
