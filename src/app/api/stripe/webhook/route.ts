// ══════════════════════════════════════════════════════════════
// POST /api/stripe/webhook
// Handler Stripe — vérifie la signature, gère les events.
// ⚠️ Pas d'auth utilisateur : protégé par signature Stripe.
// ⚠️ Body lu en raw text (req.text()) pour la vérification.
// ══════════════════════════════════════════════════════════════

export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { stripe, getTierFromPriceId } from '@/lib/stripe/config'
import { getCoachPackByPriceId, athleteTierForCoachTier, type CoachPack, type CoachTier, type BillingPeriod } from '@/lib/subscriptions/coach-packs'
import { createServiceClient } from '@/lib/supabase/server'
import { notifyUser } from '@/lib/notifications/dispatch'
import { creditStudioPack } from '@/lib/tokens/studio'
import { STUDIO_PACKS } from '@/lib/studio/offers'
import type { TierName } from '@/lib/subscriptions/tier-limits'

// ── Helpers ────────────────────────────────────────────────────

function customerId(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
): string | null {
  if (!customer) return null
  return typeof customer === 'string' ? customer : customer.id
}

function mapStatus(
  status: Stripe.Subscription.Status,
): 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete' | 'unpaid' | 'paused' {
  if (status === 'trialing')  return 'trialing'
  if (status === 'canceled')  return 'canceled'
  if (status === 'past_due')  return 'past_due'
  // Statuts NON-entitlants : ne jamais les écraser en 'active', sinon un
  // abonnement jamais réglé donnerait un accès payant.
  if (status === 'incomplete' || status === 'incomplete_expired') return 'incomplete'
  if (status === 'unpaid')  return 'unpaid'
  if (status === 'paused')  return 'paused'
  return 'active'
}

/** Retrouve un userId Supabase à partir d'un email (paiement par Payment Link). */
async function findUserIdByEmail(
  sb: ReturnType<typeof createServiceClient>,
  email: string | null | undefined,
): Promise<string | null> {
  const e = (email ?? '').toLowerCase()
  if (!e) return null
  try {
    for (let page = 1; page <= 5; page++) {
      const { data } = await sb.auth.admin.listUsers({ page, perPage: 200 })
      const match = data?.users?.find((u: { email?: string }) => (u.email ?? '').toLowerCase() === e)
      if (match) return match.id
      if (!data?.users?.length || data.users.length < 200) break
    }
  } catch (e2) { console.warn('[stripe/webhook] user lookup by email failed:', e2) }
  return null
}

/**
 * Identifie le pack coach d'un abonnement Stripe, d'abord par Price ID (si les
 * env sont configurées), sinon par le MONTANT unitaire + intervalle du prix
 * (cas Payment Link, source de vérité non falsifiable).
 */
function resolveCoachPack(
  subscription: Stripe.Subscription,
): { pack: CoachPack; tier: CoachTier; period: BillingPeriod } | null {
  const price = subscription.items.data[0]?.price
  // Attribution par PRICE ID uniquement (unique, non ambigu) → pas de collision
  // de montant entre formules (ex. Équipe+Expert et Club peuvent avoir le même prix).
  return getCoachPackByPriceId(price?.id ?? null)
}

// ── Handler ────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // ── Vérification signature ────────────────────────────────────
  const body = await req.text()  // raw body obligatoire
  const sig  = req.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Signature manquante' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET ?? '',
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[stripe/webhook] Signature invalide:', msg)
    return NextResponse.json({ error: `Signature invalide: ${msg}` }, { status: 400 })
  }

  const sb = createServiceClient()

  // ── Idempotence : chaque event.id n'est traité qu'une seule fois ──
  // Stripe REJOUE les webhooks (timeouts, retries). Sans garde, un
  // `creditStudioPack` (additif) doublerait le solde de tokens. On pose une
  // ligne unique par event.id ; si elle existe déjà, on court-circuite.
  {
    const { error: dupErr } = await sb
      .from('stripe_processed_events')
      .insert({ event_id: event.id, event_type: event.type })
    if (dupErr) {
      // Conflit de clé primaire = event déjà traité → 200 sans rejouer.
      if (dupErr.code === '23505') {
        console.log(`[stripe/webhook] event ${event.id} déjà traité — ignoré`)
        return NextResponse.json({ received: true, duplicate: true })
      }
      // Autre erreur (table absente, etc.) : on log mais on NE bloque pas le
      // traitement — mieux vaut un éventuel doublon rare qu'un webhook perdu.
      console.warn('[stripe/webhook] idempotency insert error:', dupErr.message)
    }
  }

  // ── Dispatch events ───────────────────────────────────────────
  try {
    switch (event.type) {

      // ── account.updated (Connect) : maj des capacités du compte coach ──
      case 'account.updated': {
        const acct = event.data.object as Stripe.Account
        await sb.from('coach_stripe_accounts').update({
          charges_enabled: !!acct.charges_enabled,
          payouts_enabled: !!acct.payouts_enabled,
          updated_at: new Date().toISOString(),
        }).eq('stripe_account_id', acct.id)
        break
      }

      // ── checkout.session.completed ──────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        // Achat d'un PROGRAMME (marketplace) → enregistre l'accès de l'acheteur.
        if (session.metadata?.kind === 'program') {
          const m = session.metadata
          if (m.programId && m.buyerId && m.coachId) {
            await sb.from('program_purchases').upsert({
              program_id: m.programId, buyer_id: m.buyerId, coach_id: m.coachId,
              amount_cents: session.amount_total ?? 0,
              platform_fee_cents: parseInt(m.feeCents ?? '0', 10),
              status: 'active', stripe_session_id: session.id,
            }, { onConflict: 'program_id,buyer_id' })
            void notifyUser(m.buyerId, 'coach.pack_active', {
              title: 'Programme débloqué', body: 'Ton programme est disponible. Bon entraînement !',
              url: `/programmes/${m.programId}`, dedupKey: `prog-buy-${session.id}`, once: true,
            })
            void notifyUser(m.coachId, 'coach.pack_active', {
              title: 'Nouvelle vente', body: 'Un athlète vient d’acheter un de tes programmes.',
              url: '/coach/programs', dedupKey: `prog-sale-${session.id}`, once: true,
            })
            console.log(`[stripe/webhook] program purchase → ${m.buyerId} bought ${m.programId}`)
          }
          break
        }

        // Paiement unique — pack de tokens STUDIO → crédite le wallet Studio.
        // Deux origines possibles :
        //  • checkout créé par l'app (/api/studio/checkout) → metadata.studioPack + userId ;
        //  • PAYMENT LINK (buy.stripe.com, depuis le site web) → pack identifié par le
        //    Price ID des line items, utilisateur retrouvé via client_reference_id
        //    (?client_reference_id=<uid> sur le lien) ou, à défaut, l'email de paiement.
        if (session.mode === 'payment') {
          // 1) Identifier le pack.
          let packKey: string | null = session.metadata?.studioPack ?? null
          let tokens = parseInt(session.metadata?.studioTokens ?? '0', 10)
          if (!packKey) {
            try {
              const items = await stripe.checkout.sessions.listLineItems(session.id, { limit: 5 })
              const priceIds = items.data.map(li => li.price?.id).filter(Boolean) as string[]
              const PRICE_TO_PACK: Record<string, string> = {}
              if (process.env.STRIPE_PRICE_STUDIO_DECOUVERTE) PRICE_TO_PACK[process.env.STRIPE_PRICE_STUDIO_DECOUVERTE] = 'decouverte'
              if (process.env.STRIPE_PRICE_STUDIO_BUILDER)    PRICE_TO_PACK[process.env.STRIPE_PRICE_STUDIO_BUILDER]    = 'builder'
              if (process.env.STRIPE_PRICE_STUDIO_ARCHITECTE) PRICE_TO_PACK[process.env.STRIPE_PRICE_STUDIO_ARCHITECTE] = 'architecte'
              packKey = priceIds.map(id => PRICE_TO_PACK[id]).find(Boolean) ?? null
            } catch (e) { console.warn('[stripe/webhook] listLineItems failed:', e) }
          }
          if (!packKey) break   // paiement unique sans rapport avec le Studio
          if (!tokens || tokens <= 0) {
            tokens = STUDIO_PACKS.find(p => p.key === packKey)?.tokens ?? 0
          }

          // 2) Identifier l'utilisateur.
          let packUserId: string | null = session.metadata?.userId ?? session.client_reference_id ?? null
          if (!packUserId) {
            const email = (session.customer_details?.email ?? session.customer_email ?? '').toLowerCase()
            if (email) {
              try {
                for (let page = 1; page <= 5 && !packUserId; page++) {
                  const { data: usersPage } = await sb.auth.admin.listUsers({ page, perPage: 200 })
                  const match = usersPage?.users?.find((u: { email?: string }) => (u.email ?? '').toLowerCase() === email)
                  if (match) packUserId = match.id
                  if (!usersPage?.users?.length || usersPage.users.length < 200) break
                }
              } catch (e) { console.warn('[stripe/webhook] user lookup by email failed:', e) }
            }
          }
          if (!packUserId) {
            console.warn(`[stripe/webhook] pack ${packKey} payé (session ${session.id}) mais utilisateur introuvable — crédit manuel requis`)
            break
          }

          if (tokens > 0) {
            await creditStudioPack(packUserId, tokens)
            void notifyUser(packUserId, 'tokens.pack_credite', {
              title: 'Pack Studio crédité',
              body: `${Math.round(tokens / 1000)}k tokens Studio ajoutés à ton solde. Bon build !`,
              url: '/',
              dedupKey: `studio-pack-${session.id}`,
              once: true,
            })
            console.log(`[stripe/webhook] studio pack ${packKey} → user ${packUserId} +${tokens} tokens`)
          }
          break
        }

        if (session.mode !== 'subscription') break

        // userId : metadata (Checkout Session app) OU client_reference_id
        // (Payment Link) OU email de paiement en dernier recours.
        let userId = session.metadata?.userId ?? session.client_reference_id ?? null
        if (!userId) {
          userId = await findUserIdByEmail(sb, session.customer_details?.email ?? session.customer_email)
        }
        if (!userId) {
          console.warn(`[stripe/webhook] checkout.session.completed: utilisateur introuvable (session ${session.id})`)
          break
        }

        const subscriptionId = session.subscription as string
        const custId         = customerId(session.customer)
        if (!custId) break

        // Récupère les détails de l'abonnement
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        const priceId      = subscription.items.data[0]?.price.id ?? ''

        // Pack COACH → provisionne coach_subscriptions + débloque l'accès coach.
        // Détection par Price ID (env) OU par montant (Payment Link).
        const coachMatch = resolveCoachPack(subscription)
        if (coachMatch) {
          const coachPack = coachMatch.pack
          await sb.from('coach_subscriptions').upsert({
            user_id: userId, pack_key: coachPack.key, max_athletes: coachPack.maxAthletes,
            stripe_customer_id: custId, stripe_subscription_id: subscriptionId,
            status: mapStatus(subscription.status),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' })
          await sb.from('profiles').update({ coach_subscribed: true }).eq('id', userId)
          // Un pack coach INCLUT l'abonnement athlète (Pro ou Expert selon la
          // formule) → on débloque le tier athlète correspondant pour le coach.
          await sb.from('user_subscriptions').upsert({
            user_id: userId, tier: athleteTierForCoachTier(coachMatch.tier),
            stripe_customer_id: custId, stripe_subscription_id: subscriptionId,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            status: mapStatus(subscription.status), updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' })
          void notifyUser(userId, 'coach.pack_active', {
            title: 'Abonnement coach activé',
            body: `Pack ${coachPack.name} — ${coachPack.label.toLowerCase()}. Ton espace coach est débloqué.`,
            url: '/coach/subscription',
            dedupKey: `coach-pack-${subscriptionId}`,
            once: true,
          })
          console.log(`[stripe/webhook] checkout.session.completed → coach ${userId} → pack ${coachPack.key}`)
          break
        }

        const tier: TierName | null = getTierFromPriceId(priceId)
        if (!tier) {
          // Prix non mappé : ne JAMAIS accorder un tier arbitraire. On enregistre
          // néanmoins l'abonnement (customer/subscription id) pour la traçabilité
          // et le portail, sans droit payant tant que le prix n'est pas reconnu.
          console.error(`[stripe/webhook] checkout.session.completed: prix inconnu ${priceId} (user ${userId}) — aucun tier accordé`)
          await sb.from('user_subscriptions').upsert(
            {
              user_id:                userId,
              stripe_customer_id:     custId,
              stripe_subscription_id: subscriptionId,
              status:                 'incomplete',
            },
            { onConflict: 'user_id' },
          )
          break
        }

        await sb.from('user_subscriptions').upsert(
          {
            user_id:                userId,
            tier,
            stripe_customer_id:     custId,
            stripe_subscription_id: subscriptionId,
            current_period_start:   new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end:     new Date(subscription.current_period_end   * 1000).toISOString(),
            status:                 mapStatus(subscription.status),
          },
          { onConflict: 'user_id' },
        )

        console.log(`[stripe/webhook] checkout.session.completed → user ${userId} → tier ${tier}`)
        break
      }

      // ── customer.subscription.updated ──────────────────────
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const custId       = customerId(subscription.customer)
        if (!custId) break

        // Abonnement coach ? On le reconnaît par la ligne coach_subscriptions
        // (posée à la souscription) OU par le pack dérivé du prix/montant.
        const { data: csRow } = await sb.from('coach_subscriptions')
          .select('user_id').eq('stripe_customer_id', custId).maybeSingle()
        const updCoachMatch = resolveCoachPack(subscription)
        if (csRow?.user_id || updCoachMatch) {
          const coachUserId = csRow?.user_id
            ?? (subscription.metadata?.userId ?? null)
          if (coachUserId) {
            const active = subscription.status === 'active' || subscription.status === 'trialing'
            const patch: Record<string, unknown> = {
              status: mapStatus(subscription.status),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              updated_at: new Date().toISOString(),
            }
            if (updCoachMatch) { patch.pack_key = updCoachMatch.pack.key; patch.max_athletes = updCoachMatch.pack.maxAthletes }
            await sb.from('coach_subscriptions').update(patch).eq('user_id', coachUserId)
            await sb.from('profiles').update({ coach_subscribed: active }).eq('id', coachUserId)
            // Met à jour le niveau athlète inclus (Pro/Expert) si la formule change.
            if (updCoachMatch) {
              await sb.from('user_subscriptions').update({
                tier: athleteTierForCoachTier(updCoachMatch.tier),
                status: mapStatus(subscription.status),
                current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                updated_at: new Date().toISOString(),
              }).eq('user_id', coachUserId)
            }
            console.log(`[stripe/webhook] subscription.updated → coach ${coachUserId} status ${subscription.status}`)
          }
          break
        }

        // Retrouve l'utilisateur via le customer ID
        const { data: subRow } = await sb
          .from('user_subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', custId)
          .single()

        if (!subRow) {
          console.warn('[stripe/webhook] subscription.updated: customer non trouvé:', custId)
          break
        }

        const priceId    = subscription.items.data[0]?.price.id ?? ''
        const tier: TierName | null = getTierFromPriceId(priceId)

        // Prix inconnu → on met à jour le statut/les dates mais on NE touche PAS
        // au tier (on conserve celui déjà en base plutôt que d'accorder un défaut).
        const updatePatch: Record<string, unknown> = {
          status:               mapStatus(subscription.status),
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end:   new Date(subscription.current_period_end   * 1000).toISOString(),
        }
        if (tier) updatePatch.tier = tier
        else console.error(`[stripe/webhook] subscription.updated: prix inconnu ${priceId} (user ${subRow.user_id}) — tier conservé`)

        await sb.from('user_subscriptions').update(updatePatch).eq('user_id', subRow.user_id)

        console.log(`[stripe/webhook] subscription.updated → user ${subRow.user_id} → tier ${tier ?? '(inchangé)'} status ${subscription.status}`)
        break
      }

      // ── customer.subscription.deleted ──────────────────────
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const custId       = customerId(subscription.customer)
        if (!custId) break

        // Coach ? Reconnu par la ligne coach_subscriptions (customer/subscription)
        // ou par le pack dérivé du prix — indépendant des Price IDs env.
        const { data: csDel } = await sb.from('coach_subscriptions')
          .select('user_id').eq('stripe_customer_id', custId).maybeSingle()
        if (csDel?.user_id || resolveCoachPack(subscription)) {
          const delUserId = csDel?.user_id ?? subscription.metadata?.userId ?? null
          if (delUserId) {
            await sb.from('coach_subscriptions').update({ status: 'canceled', updated_at: new Date().toISOString() }).eq('user_id', delUserId)
            await sb.from('profiles').update({ coach_subscribed: false }).eq('id', delUserId)
            // Sécurité : sans pack actif, l'ex-coach ne doit plus accéder aux
            // données de ses athlètes. On révoque les liens acceptés (la RLS coach
            // s'appuie sur status='accepted'). Le coach devra ré-inviter s'il
            // reprend un pack — c'est le comportement attendu d'une résiliation.
            const { data: revoked } = await sb.from('coach_athlete')
              .update({ status: 'revoked', revoked_at: new Date().toISOString() })
              .eq('coach_id', delUserId).eq('status', 'accepted')
              .select('id')
            if (revoked?.length) console.log(`[stripe/webhook] subscription.deleted → coach ${delUserId} → ${revoked.length} lien(s) athlète révoqué(s)`)
            void notifyUser(delUserId, 'coach.pack_ended', {
              title: 'Abonnement coach terminé',
              body: 'Ton accès coach est désactivé. Reprends un pack quand tu veux pour le réactiver.',
              url: '/coach/subscription',
              dedupKey: `coach-pack-end-${subscription.id}`,
              once: true,
            })
            console.log(`[stripe/webhook] subscription.deleted → coach ${delUserId} → accès coach retiré`)
          }
          break
        }

        const { data: subRow } = await sb
          .from('user_subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', custId)
          .single()

        if (!subRow) break

        // Downgrade vers premium + status canceled
        await sb.from('user_subscriptions').update({
          tier:   'premium',
          status: 'canceled',
        }).eq('user_id', subRow.user_id)

        console.log(`[stripe/webhook] subscription.deleted → user ${subRow.user_id} → downgraded to premium`)
        break
      }

      // ── invoice.payment_failed ──────────────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const custId  = customerId(invoice.customer)
        if (!custId) break

        const { data: subRow } = await sb
          .from('user_subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', custId)
          .single()

        if (!subRow) break

        await sb.from('user_subscriptions').update({
          status: 'past_due',
        }).eq('user_id', subRow.user_id)

        void notifyUser(subRow.user_id, 'tokens.paiement_echoue', {
          title: 'Paiement échoué',
          body: 'Ton dernier paiement n’a pas abouti. Mets à jour ton moyen de paiement pour garder ton accès.',
          url: '/settings/subscription',
          dedupKey: `payfail-${invoice.id}`,
          once: true,
        })

        console.log(`[stripe/webhook] invoice.payment_failed → user ${subRow.user_id} → past_due`)
        break
      }

      default:
        // Event non géré — on ignore silencieusement
        break
    }
  } catch (err) {
    console.error('[stripe/webhook] Erreur handler:', err)
    return NextResponse.json({ error: 'Erreur interne du webhook' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
