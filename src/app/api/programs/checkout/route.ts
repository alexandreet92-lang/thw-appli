// POST /api/programs/checkout  { programId }
// Achat d'un programme payant. Charge à destination du compte Connect du coach,
// avec commission plateforme (10 % standard / 30 % si IA) via application_fee.
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe/config'
import { platformFeePct } from '@/lib/coach/programs'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { programId } = await req.json() as { programId?: string }
    if (!programId) return NextResponse.json({ error: 'programId manquant' }, { status: 400 })

    const svc = createServiceClient()
    const { data: prog } = await svc.from('coach_programs')
      .select('id, coach_id, title, price_cents, currency, ai_enabled, trial_days, published')
      .eq('id', programId).maybeSingle()
    if (!prog) return NextResponse.json({ error: 'Programme introuvable' }, { status: 404 })
    const p = prog as { id: string; coach_id: string; title: string; price_cents: number; currency: string; ai_enabled: boolean; trial_days: number; published: boolean }
    if (!p.published) return NextResponse.json({ error: 'Programme non publié' }, { status: 400 })
    if (p.price_cents <= 0) return NextResponse.json({ error: 'Programme gratuit' }, { status: 400 })
    if (p.coach_id === user.id) return NextResponse.json({ error: 'C’est ton programme' }, { status: 400 })

    // Déjà acheté ?
    const { data: owned } = await svc.from('program_purchases').select('id').eq('program_id', p.id).eq('buyer_id', user.id).eq('status', 'active').maybeSingle()
    if (owned) return NextResponse.json({ error: 'Déjà acheté', code: 'owned' }, { status: 409 })

    // Compte Connect du coach.
    const { data: acct } = await svc.from('coach_stripe_accounts').select('stripe_account_id, charges_enabled').eq('user_id', p.coach_id).maybeSingle()
    const coachAcct = acct as { stripe_account_id?: string; charges_enabled?: boolean } | null
    if (!coachAcct?.stripe_account_id || !coachAcct.charges_enabled) {
      return NextResponse.json({ error: 'Ce coach ne peut pas encore recevoir de paiements.' }, { status: 409 })
    }

    const feePct = platformFeePct(p.ai_enabled)
    const feeCents = Math.round(p.price_cents * feePct / 100)

    const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://thw-appli.vercel.app'
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        quantity: 1,
        price_data: {
          currency: p.currency || 'eur',
          unit_amount: p.price_cents,
          product_data: { name: p.title || 'Programme d’entraînement' },
        },
      }],
      payment_intent_data: {
        application_fee_amount: feeCents,
        transfer_data: { destination: coachAcct.stripe_account_id },
      },
      success_url: `${origin}/programmes/${p.id}?purchased=1`,
      cancel_url: `${origin}/programmes/${p.id}?canceled=1`,
      locale: 'fr',
      metadata: { kind: 'program', programId: p.id, buyerId: user.id, coachId: p.coach_id, feeCents: String(feeCents) },
    })
    return NextResponse.json({ url: session.url })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[programs/checkout] error:', msg)
    return NextResponse.json({ error: `Erreur Stripe : ${msg}` }, { status: 500 })
  }
}
