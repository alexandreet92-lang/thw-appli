// ══════════════════════════════════════════════════════════════
// GET /api/studio/packs — prix Stripe des packs de tokens Studio.
// Les Price IDs vivent dans l'env (STRIPE_PRICE_STUDIO_*) : on lit leur
// montant chez Stripe pour l'afficher dans la fenêtre « Tokens Studio »
// (web uniquement — l'app iOS n'affiche aucun prix hors Apple).
// Return: { prices: Partial<Record<StudioPackKey, { amount: number; currency: string }>> }
// Cache mémoire 10 min (les prix changent rarement).
// ══════════════════════════════════════════════════════════════
import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/config'
import { STUDIO_PACKS, type StudioPackKey } from '@/lib/studio/offers'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type PackPrice = { amount: number; currency: string }
type PriceMap = Partial<Record<StudioPackKey, PackPrice>>

const PRICE_ENV: Record<StudioPackKey, string | undefined> = {
  decouverte: process.env.STRIPE_PRICE_STUDIO_DECOUVERTE,
  builder:    process.env.STRIPE_PRICE_STUDIO_BUILDER,
  architecte: process.env.STRIPE_PRICE_STUDIO_ARCHITECTE,
}

const TTL_MS = 10 * 60 * 1000
let cache: { at: number; prices: PriceMap } | null = null

export async function GET() {
  if (cache && Date.now() - cache.at < TTL_MS) return NextResponse.json({ prices: cache.prices })

  const prices: PriceMap = {}
  await Promise.all(STUDIO_PACKS.map(async p => {
    const priceId = PRICE_ENV[p.key]
    if (!priceId) return
    try {
      const pr = await stripe.prices.retrieve(priceId)
      if (typeof pr.unit_amount === 'number') prices[p.key] = { amount: pr.unit_amount, currency: pr.currency }
    } catch (e) {
      console.warn('[studio/packs] price retrieve failed:', p.key, e instanceof Error ? e.message : e)
    }
  }))

  cache = { at: Date.now(), prices }
  return NextResponse.json({ prices })
}
