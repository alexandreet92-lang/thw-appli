// GET /api/coach/connect/status — rafraîchit et renvoie l'état du compte Connect.
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe/config'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const svc = createServiceClient()
    const { data: row } = await svc.from('coach_stripe_accounts').select('stripe_account_id').eq('user_id', user.id).maybeSingle()
    const accountId = (row as { stripe_account_id?: string } | null)?.stripe_account_id
    if (!accountId) return NextResponse.json({ connected: false, chargesEnabled: false, payoutsEnabled: false })

    const acct = await stripe.accounts.retrieve(accountId)
    const chargesEnabled = !!acct.charges_enabled
    const payoutsEnabled = !!acct.payouts_enabled
    await svc.from('coach_stripe_accounts').update({ charges_enabled: chargesEnabled, payouts_enabled: payoutsEnabled, updated_at: new Date().toISOString() }).eq('user_id', user.id)
    return NextResponse.json({ connected: true, chargesEnabled, payoutsEnabled })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[connect/status] error:', msg)
    return NextResponse.json({ error: msg, connected: false, chargesEnabled: false, payoutsEnabled: false }, { status: 500 })
  }
}
