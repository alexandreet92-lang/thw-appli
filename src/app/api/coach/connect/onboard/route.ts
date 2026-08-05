// POST /api/coach/connect/onboard
// Crée (ou reprend) le compte Stripe Connect Express du coach et renvoie
// l'URL d'inscription hébergée par Stripe (Account Link).
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe/config'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const svc = createServiceClient()
    const { data: row } = await svc.from('coach_stripe_accounts').select('stripe_account_id').eq('user_id', user.id).maybeSingle()
    let accountId = (row as { stripe_account_id?: string } | null)?.stripe_account_id

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: user.email ?? undefined,
        capabilities: { transfers: { requested: true } },
        business_type: 'individual',
        metadata: { userId: user.id },
      })
      accountId = account.id
      await svc.from('coach_stripe_accounts').upsert(
        { user_id: user.id, stripe_account_id: accountId, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      )
    }

    const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://thw-appli.vercel.app'
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/coach/programs?connect=refresh`,
      return_url: `${origin}/coach/programs?connect=done`,
      type: 'account_onboarding',
    })
    return NextResponse.json({ url: link.url })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[connect/onboard] error:', msg)
    return NextResponse.json({ error: `Erreur Stripe : ${msg}` }, { status: 500 })
  }
}
