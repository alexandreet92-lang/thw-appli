// ══════════════════════════════════════════════════════════════
// CRON quotidien des notifications à base de DATE / HEURE.
// Déclenché par Vercel Cron (gardé par CRON_SECRET, comme /api/coach/learn).
//
// Couvre : compétitions J-7/J-3/J-1, recharge glucidique avant course,
// séance du jour, programme du matin, rappel HRV, hydratation, rappel repas,
// résumé hebdo (lundi) / mensuel (1er), astuce du jour, plan en expiration.
//
// Chaque envoi passe par notifyUser() → respecte le toggle de l'utilisateur
// et écrit à la fois la notif in-app (cloche) et le push.
// ══════════════════════════════════════════════════════════════

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { notifyUser } from '@/lib/notifications/dispatch'

const DAY = 86400000
function ymd(d: Date): string { return d.toISOString().slice(0, 10) }

// Astuces du jour (rotation par jour de l'année).
const TIPS: string[] = [
  'Note ton ressenti après chaque séance : le coach affine ses conseils.',
  'Un échauffement de 10 min réduit nettement le risque de blessure.',
  'La régularité bat l’intensité : mieux vaut 4 séances tenues qu’une séance parfaite.',
  'Bois avant d’avoir soif, surtout les jours de grosse charge.',
  'Le sommeil est ton meilleur outil de récupération. Vise la régularité.',
  'Analyse une de tes activités avec le coach pour repérer un axe de progrès.',
  'Varie les intensités : le facile doit être vraiment facile, le dur vraiment dur.',
]

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sb = createServiceClient()
  const now = new Date()
  const today = ymd(now)
  const plus = (n: number) => ymd(new Date(now.getTime() + n * DAY))
  const mondayIdx = (now.getUTCDay() + 6) % 7        // lundi = 0 … dimanche = 6
  const weekStart = ymd(new Date(now.getTime() - mondayIdx * DAY))
  const isMonday = mondayIdx === 0
  const isFirstOfMonth = now.getUTCDate() === 1
  const dayOfYear = Math.floor((now.getTime() - Date.UTC(now.getUTCFullYear(), 0, 0)) / DAY)

  // Seuls les utilisateurs avec au moins un appareil abonné (ou qui verront
  // la cloche) comptent. On part des abonnements push pour borner la charge.
  const { data: subs } = await sb.from('push_subscriptions').select('user_id')
  const userIds = Array.from(new Set(((subs ?? []) as Array<{ user_id: string }>).map(s => s.user_id))).filter(Boolean)
  if (userIds.length === 0) return NextResponse.json({ ok: true, users: 0, sent: 0 })

  let sent = 0
  const fire = async (uid: string, key: Parameters<typeof notifyUser>[1], payload: Parameters<typeof notifyUser>[2]) => {
    try { await notifyUser(uid, key, payload); sent++ } catch { /* best-effort */ }
  }

  // ── 1. Compétitions J-7 / J-3 / J-1 + recharge glucidique J-2/J-1 ──
  try {
    const { data: races } = await sb.from('planned_races')
      .select('user_id,name,date')
      .in('user_id', userIds)
      .in('date', [plus(1), plus(2), plus(3), plus(7)])
    for (const r of (races ?? []) as Array<{ user_id: string; name: string | null; date: string }>) {
      const uid = r.user_id
      const name = r.name || 'Ta compétition'
      if (r.date === plus(7)) {
        await fire(uid, 'competitions.j7', { title: 'Compétition dans 7 jours', body: `${name} approche. On peaufine les derniers réglages.`, url: '/planning', dedupKey: `comp-j7-${r.date}-${name}`, once: true })
      } else if (r.date === plus(3)) {
        await fire(uid, 'competitions.j3', { title: 'Compétition dans 3 jours', body: `${name} : derniers préparatifs.`, url: '/planning', dedupKey: `comp-j3-${r.date}-${name}`, once: true })
      } else if (r.date === plus(1)) {
        await fire(uid, 'competitions.j1', { title: "C'est demain !", body: `${name} a lieu demain. Repos et confiance 💪`, url: '/planning', dedupKey: `comp-j1-${r.date}-${name}`, once: true })
      }
      if (r.date === plus(1) || r.date === plus(2)) {
        await fire(uid, 'nutrition.recharge_glucidique', { title: 'Recharge glucidique', body: `${name} approche : pense à recharger tes réserves de glycogène.`, url: '/nutrition', dedupKey: `recharge-${r.date}-${name}`, once: true })
      }
    }
  } catch { /* best-effort */ }

  // ── 2. Séance planifiée du jour ──
  try {
    const { data: sessions } = await sb.from('planned_sessions')
      .select('user_id,title,sport,time,status,day_index')
      .in('user_id', userIds)
      .eq('week_start', weekStart)
      .eq('day_index', mondayIdx)
    for (const s of (sessions ?? []) as Array<{ user_id: string; title: string | null; sport: string | null; time: string | null; status: string | null }>) {
      if (s.status === 'done' || s.status === 'skipped') continue
      const label = s.title || (s.sport ? `Séance ${s.sport}` : 'Séance du jour')
      await fire(s.user_id, 'entrainement.rappel_seance', { title: 'Séance du jour', body: `${label}${s.time ? ` — ${s.time}` : ''}`, url: '/planning', dedupKey: `seance-${today}`, })
    }
  } catch { /* best-effort */ }

  // ── 3. Plan / essai en expiration (~3 jours) ──
  try {
    const { data: subsRows } = await sb.from('user_subscriptions')
      .select('user_id,current_period_end,trial_ends_at,status,cancel_at_period_end')
      .in('user_id', userIds)
    for (const s of (subsRows ?? []) as Array<{ user_id: string; current_period_end: string | null; trial_ends_at: string | null; status: string | null; cancel_at_period_end: boolean | null }>) {
      const trialEnd = s.trial_ends_at ? s.trial_ends_at.slice(0, 10) : null
      const periodEnd = s.current_period_end ? s.current_period_end.slice(0, 10) : null
      const trialEnding = s.status === 'trialing' && trialEnd && (trialEnd === plus(3) || trialEnd === plus(1))
      const subEnding = s.cancel_at_period_end && periodEnd && (periodEnd === plus(3) || periodEnd === plus(1))
      if (trialEnding || subEnding) {
        const endDate = trialEnding ? trialEnd! : periodEnd!
        await fire(s.user_id, 'tokens.plan_expiration', { title: 'Ton abonnement arrive à échéance', body: trialEnding ? 'Ta période d’essai se termine bientôt.' : 'Ton abonnement se termine bientôt.', url: '/settings/subscription', dedupKey: `expire-${endDate}`, once: true })
      }
    }
  } catch { /* best-effort */ }

  // ── 4. Rappels quotidiens (à tous, filtrés par préférence individuelle) ──
  for (const uid of userIds) {
    await fire(uid, 'entrainement.programme_matin', { title: 'Ton programme du jour', body: 'Ouvre ton briefing du matin pour voir le plan du jour.', url: '/briefing', dedupKey: `matin-${today}` })
    await fire(uid, 'recuperation.rappel_hrv', { title: 'Mesure HRV', body: 'Pense à mesurer ta HRV au réveil pour ajuster ta charge.', url: '/recovery', dedupKey: `hrv-${today}` })
    await fire(uid, 'nutrition.hydratation', { title: 'Hydratation', body: "Objectif du jour : bien t'hydrater 💧", url: '/nutrition', dedupKey: `hydra-${today}` })
    await fire(uid, 'nutrition.rappel_repas', { title: 'Repas', body: 'Pense à bien répartir tes repas et tes apports aujourd’hui.', url: '/nutrition', dedupKey: `repas-${today}` })
    await fire(uid, 'systeme.astuce', { title: 'Astuce du jour', body: TIPS[dayOfYear % TIPS.length], url: '/', dedupKey: `astuce-${today}` })
    if (isMonday) await fire(uid, 'performance.resume_hebdo', { title: 'Résumé de la semaine', body: 'Ton bilan charge & progression de la semaine est prêt.', url: '/performance', dedupKey: `hebdo-${today}`, once: true })
    if (isFirstOfMonth) await fire(uid, 'performance.resume_mensuel', { title: 'Résumé du mois', body: 'Ta synthèse mensuelle est disponible.', url: '/performance', dedupKey: `mensuel-${today}`, once: true })
  }

  return NextResponse.json({ ok: true, users: userIds.length, sent })
}
