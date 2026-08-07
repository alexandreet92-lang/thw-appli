// ══════════════════════════════════════════════════════════════════════════
// POST /api/community/spaces — création d'un espace communautaire (kind='user').
//
// GATING VÉRIFIÉ CÔTÉ SERVEUR (jamais seulement UI) :
//   - l'utilisateur doit avoir le droit de créer (community_can_create) ;
//   - quota d'espaces créés (community_spaces_max) ;
//   - espace privé réservé aux tiers habilités (community_private_spaces) ;
//   - branding (icône/bannière) réservé (community_branding).
// La source de vérité des règles = TIER_LIMITS.community_* (via communityEntitlements),
// et NON du code en dur ici. L'insertion passe par le service role car
// community_spaces n'expose aucune policy INSERT à `authenticated` (défense en
// profondeur : impossible de créer un espace en contournant cette route).
// ══════════════════════════════════════════════════════════════════════════
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getUserTier, isCreatorAccount } from '@/lib/subscriptions/check-quota'
import { communityEntitlements } from '@/lib/subscriptions/tier-limits'
import type { CommunitySport } from '@/types/community'

export const dynamic = 'force-dynamic'

const SPORTS: CommunitySport[] = ['running', 'cycling', 'hyrox', 'gym']

interface Body {
  name?: string
  description?: string | null
  sport?: string | null
  iconEmoji?: string | null
  iconUrl?: string | null
  isPublic?: boolean
  channels?: string[]
}

function slugify(name: string): string {
  const base = name
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // enlève les accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  const suffix = crypto.randomUUID().replace(/-/g, '').slice(0, 6)
  const slug = `${base || 'espace'}-${suffix}`
  return slug.slice(0, 60)
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    // ── Entitlement (source de vérité = TIER_LIMITS) ──────────────────────
    const unlimited = await isCreatorAccount(user.id)
    const tier = await getUserTier(user.id)
    const ent = communityEntitlements(tier, unlimited)

    if (!ent.canCreate) {
      return NextResponse.json(
        { error: 'Passe Premium pour créer un espace.', code: 'upgrade_required', upgrade_url: '/settings/subscription' },
        { status: 403 },
      )
    }

    const body = (await req.json().catch(() => ({}))) as Body
    const name = (body.name ?? '').trim()
    if (name.length < 1 || name.length > 80) {
      return NextResponse.json({ error: 'Nom d\'espace invalide (1 à 80 caractères).' }, { status: 400 })
    }

    const wantPrivate = body.isPublic === false
    if (wantPrivate && !ent.canPrivate) {
      return NextResponse.json(
        { error: 'Les espaces privés sont réservés à l\'abonnement Pro.', code: 'upgrade_required', upgrade_url: '/settings/subscription' },
        { status: 403 },
      )
    }

    const sport = body.sport && (SPORTS as string[]).includes(body.sport) ? (body.sport as CommunitySport) : null
    // Branding : icône personnalisée seulement si le tier y a droit.
    const iconEmoji = ent.canBrand && body.iconEmoji ? body.iconEmoji.slice(0, 8) : '👥'
    const description = (body.description ?? '').toString().slice(0, 400) || null
    // Logo uploadé : accepté seulement s'il pointe vers notre stockage Supabase
    // (l'upload passe par /api/community/upload → bucket public). Anti-URL arbitraire.
    const supaBase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
    const rawIcon = typeof body.iconUrl === 'string' ? body.iconUrl : ''
    const iconUrl = rawIcon && rawIcon.length <= 600 && supaBase && rawIcon.startsWith(supaBase) ? rawIcon : null

    // ── Quota d'espaces créés (service role : compte réel, RLS bypassée) ──
    const svc = createServiceClient()
    if (isFinite(ent.maxSpaces)) {
      const { count } = await svc
        .from('community_spaces')
        .select('id', { count: 'exact', head: true })
        .eq('created_by', user.id)
        .eq('kind', 'user')
      if ((count ?? 0) >= ent.maxSpaces) {
        return NextResponse.json(
          {
            error: `Quota atteint : ton abonnement permet ${ent.maxSpaces} espace${ent.maxSpaces > 1 ? 's' : ''}.`,
            code: 'quota_reached', used: count ?? 0, limit: ent.maxSpaces, upgrade_url: '/settings/subscription',
          },
          { status: 403 },
        )
      }
    }

    // ── Création (service role) ───────────────────────────────────────────
    const { data: space, error: spaceErr } = await svc
      .from('community_spaces')
      .insert({
        name,
        slug: slugify(name),
        description,
        kind: 'user',
        sport,
        icon_emoji: iconEmoji,
        icon_url: iconUrl,
        is_public: !wantPrivate,
        created_by: user.id,
      })
      .select('id, slug')
      .single()

    if (spaceErr || !space) {
      console.error('[community/spaces] insert space error:', spaceErr)
      return NextResponse.json({ error: 'Création de l\'espace impossible.' }, { status: 500 })
    }

    // Le créateur devient owner.
    const { error: memErr } = await svc
      .from('community_members')
      .insert({ space_id: space.id, user_id: user.id, role: 'owner' })
    if (memErr) console.error('[community/spaces] insert owner member error:', memErr)

    // Canaux : #général par défaut + ceux demandés (texte uniquement en Phase 1 ;
    // les canaux vocaux arrivent en Phase 2, gated Pro+/coach).
    const requested = Array.isArray(body.channels) ? body.channels : []
    const names = ['général', ...requested]
      .map(n => n.trim().toLowerCase())
      .filter(n => n.length >= 1 && n.length <= 60)
    const uniqueNames = Array.from(new Set(names)).slice(0, 12)
    const channelRows = uniqueNames.map((n, i) => ({
      space_id: space.id, name: n, position: i, kind: 'text' as const,
    }))
    const { error: chErr } = await svc.from('community_channels').insert(channelRows)
    if (chErr) console.error('[community/spaces] insert channels error:', chErr)

    return NextResponse.json({ id: space.id, slug: space.slug }, { status: 201 })
  } catch (e) {
    console.error('[community/spaces] error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
