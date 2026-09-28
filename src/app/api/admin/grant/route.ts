// ══════════════════════════════════════════════════════════════════
// ACCÈS OFFERT — POST / GET / DELETE /api/admin/grant   (ADMIN UNIQUEMENT)
//
// Accorde un accès gratuit à un utilisateur : Coach ou Athlète, un palier
// (premium / pro / expert) et une durée (30 / 60 / 90 jours, ou illimité).
// Un accès coach ouvre aussi l'interface athlète (au palier choisi).
//
// DEUX RÈGLES DE SÛRETÉ, NON NÉGOCIABLES :
//  1. On ne touche JAMAIS un abonnement Stripe réel. Les accès offerts portent
//     le sceau `stripe_subscription_id = 'comp'` ; on n'écrit et on ne révoque
//     que ce qui porte ce sceau. Un client qui paie n'est jamais écrasé.
//  2. On ne touche JAMAIS le compte propriétaire.
// ══════════════════════════════════════════════════════════════════
import 'server-only'
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { checkAdmin } from '@/lib/admin/guard'
import { COACH_OWNER_ID } from '@/lib/coach/owner'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const SCEAU = 'comp'
const TIERS = ['premium', 'pro', 'expert'] as const
const DUREES = [30, 60, 90] as const
// Illimité côté coach : une date si lointaine qu'elle ne tombe jamais. Côté
// athlète, l'illimité est simplement une date de fin absente (NULL).
const TRES_LOIN = '2099-01-01T00:00:00.000Z'

type Tier = (typeof TIERS)[number]
type Kind = 'coach' | 'athlete'

/** Résout un e-mail → utilisateur (et l'inverse), via l'API admin. */
async function annuaire(sb: ReturnType<typeof createServiceClient>) {
  const parEmail = new Map<string, { id: string; email: string }>()
  const parId = new Map<string, string>()
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 })
    if (error || !data?.users?.length) break
    for (const u of data.users) {
      const email = (u.email ?? '').toLowerCase()
      if (email) { parEmail.set(email, { id: u.id, email }); parId.set(u.id, email) }
    }
    if (data.users.length < 1000) break
  }
  return { parEmail, parId }
}

/** L'abonnement athlète existant est-il un VRAI abonnement Stripe ? */
function estStripeReel(sub: { stripe_subscription_id?: string | null } | null): boolean {
  const id = sub?.stripe_subscription_id
  return !!id && id !== SCEAU
}

export async function POST(request: Request): Promise<NextResponse> {
  const admin = await checkAdmin()
  if (!admin.ok) return NextResponse.json({ erreur: 'Non autorisé.' }, { status: admin.status })

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const kind = (body?.kind === 'coach' ? 'coach' : 'athlete') as Kind
  const tier = (TIERS.includes(body?.tier as Tier) ? body?.tier : 'premium') as Tier
  const jours = DUREES.includes(body?.jours as 30) ? (body?.jours as number) : null // null = illimité

  if (!email) return NextResponse.json({ erreur: 'E-mail manquant.' }, { status: 400 })

  const sb = createServiceClient()
  const { parEmail } = await annuaire(sb)
  const cible = parEmail.get(email)
  if (!cible) return NextResponse.json({ erreur: 'Aucun compte avec cet e-mail.' }, { status: 404 })
  if (cible.id === COACH_OWNER_ID) {
    return NextResponse.json({ erreur: 'C’est le compte propriétaire — il a déjà tous les accès.' }, { status: 400 })
  }

  const maintenant = Date.now()
  const finIso = jours ? new Date(maintenant + jours * 86400000).toISOString() : null
  const nowIso = new Date(maintenant).toISOString()

  // L'abonnement athlète existant — pour ne jamais écraser du Stripe.
  const { data: subExist } = await sb
    .from('user_subscriptions')
    .select('stripe_subscription_id')
    .eq('user_id', cible.id)
    .maybeSingle()
  const stripeReel = estStripeReel(subExist)

  // ── Côté athlète : on pose un abonnement au SCEAU, SAUF si un vrai Stripe
  //    existe déjà (on le laisse alors intact). ──
  if (kind === 'athlete' && stripeReel) {
    return NextResponse.json({ erreur: 'Ce compte a déjà un abonnement athlète payant — je ne l’écrase pas.' }, { status: 409 })
  }
  if (!stripeReel) {
    const { error } = await sb.from('user_subscriptions').upsert({
      user_id: cible.id,
      tier,
      status: 'active',
      current_period_end: finIso,          // NULL = illimité
      cancel_at_period_end: false,
      stripe_subscription_id: SCEAU,        // le sceau : accès offert
      created_at: nowIso,
      updated_at: nowIso,
    }, { onConflict: 'user_id' })
    if (error) return NextResponse.json({ erreur: error.message }, { status: 502 })
  }

  // ── Côté coach : la date d'accès offert (lointaine si illimité). ──
  if (kind === 'coach') {
    const { error } = await sb
      .from('profiles')
      .update({ coach_access_until: finIso ?? TRES_LOIN })
      .eq('id', cible.id)
    if (error) return NextResponse.json({ erreur: error.message }, { status: 502 })
  }

  // ── Trace (liste + audit). Ne sert jamais au gating. ──
  await sb.from('comp_grants').upsert({
    user_id: cible.id,
    kind,
    tier,
    until: finIso,                          // NULL = illimité (affichage)
    granted_by: admin.email ?? '',
    created_at: nowIso,
  }, { onConflict: 'user_id,kind' })

  return NextResponse.json({
    ok: true,
    accorde: { email: cible.email, kind, tier, jusquau: finIso, garde_son_stripe: stripeReel },
  })
}

export async function GET(): Promise<NextResponse> {
  const admin = await checkAdmin()
  if (!admin.ok) return NextResponse.json({ erreur: 'Non autorisé.' }, { status: admin.status })

  const sb = createServiceClient()
  const { data, error } = await sb
    .from('comp_grants')
    .select('user_id, kind, tier, until, created_at')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ erreur: error.message }, { status: 502 })

  const { parId } = await annuaire(sb)
  const acces = (data ?? []).map((g) => ({
    email: parId.get(g.user_id) ?? '(compte supprimé)',
    kind: g.kind as Kind,
    tier: g.tier as string,
    until: g.until as string | null,
  }))
  return NextResponse.json({ acces })
}

export async function DELETE(request: Request): Promise<NextResponse> {
  const admin = await checkAdmin()
  if (!admin.ok) return NextResponse.json({ erreur: 'Non autorisé.' }, { status: admin.status })

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!email) return NextResponse.json({ erreur: 'E-mail manquant.' }, { status: 400 })

  const sb = createServiceClient()
  const { parEmail } = await annuaire(sb)
  const cible = parEmail.get(email)
  if (!cible) return NextResponse.json({ erreur: 'Aucun compte avec cet e-mail.' }, { status: 404 })

  // Coach : on retire la date d'accès offert.
  await sb.from('profiles').update({ coach_access_until: null }).eq('id', cible.id)

  // Athlète : on ferme UNIQUEMENT si c'est un accès au sceau. Jamais un Stripe.
  const { data: sub } = await sb
    .from('user_subscriptions')
    .select('stripe_subscription_id')
    .eq('user_id', cible.id)
    .maybeSingle()
  if (sub?.stripe_subscription_id === SCEAU) {
    await sb.from('user_subscriptions')
      .update({ status: 'canceled', updated_at: new Date().toISOString() })
      .eq('user_id', cible.id)
  }

  await sb.from('comp_grants').delete().eq('user_id', cible.id)

  return NextResponse.json({ ok: true, revoque: cible.email })
}
