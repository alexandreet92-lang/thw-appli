// ══════════════════════════════════════════════════════════════
// GET /api/account/summary
// Résumé du compte de l'utilisateur CONNECTÉ, pensé pour être appelé depuis le
// SITE vitrine (public/site/*) — même origine → les cookies de session sont
// envoyés automatiquement. Le site peut ainsi afficher le vrai nom, l'abonnement
// et les soldes de tokens. RLS + auth serveur : chacun ne voit que son compte.
// CORS same-origin (le site est servi sous /site/ du même domaine).
// ══════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserTier } from '@/lib/subscriptions/check-quota'
import { getUserTokenLimits } from '@/lib/tokens/limits'
import { getStudioAccess } from '@/lib/tokens/studio'
import { getCoachAccessState } from '@/lib/coach/owner'

export const dynamic = 'force-dynamic'

const TIER_LABELS: Record<string, string> = {
  premium: 'Premium', pro: 'Pro', expert: 'Expert', trial: 'Essai', free: 'Gratuit',
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  // Non connecté → 200 avec loggedIn:false (le site affiche « Se connecter »).
  if (!user) return NextResponse.json({ loggedIn: false })

  try {
    const [{ data: prof }, tier, limits, studio, coach] = await Promise.all([
      supabase.from('profiles').select('full_name, preferred_name, language').eq('id', user.id).maybeSingle(),
      getUserTier(user.id),
      getUserTokenLimits(user.id),
      getStudioAccess(user.id),
      getCoachAccessState(),
    ])

    const fullName = (prof?.full_name as string | null)?.trim() || null
    const preferred = (prof?.preferred_name as string | null)?.trim() || null
    const firstName = (preferred || fullName || user.email || '').split(/\s+/)[0] || null

    const chatRemaining = Math.max(0, (limits.monthly.limit - limits.monthly.used)) + (limits.bonus_tokens ?? 0)

    // Langue de l'app (profiles.language, réglée dans l'app) → le site vitrine
    // s'aligne dessus automatiquement, sans que l'utilisateur retouche au
    // sélecteur. On ne renvoie que les langues réellement gérées par le site.
    const rawLang = (prof?.language as string | null)?.toLowerCase() ?? null
    const language = rawLang && ['fr', 'en', 'es'].includes(rawLang) ? rawLang : null

    return NextResponse.json({
      loggedIn: true,
      language,
      email: user.email ?? null,
      name: fullName,
      preferredName: preferred,
      firstName,
      tier,
      tierLabel: TIER_LABELS[tier] ?? tier,
      isCoach: coach.access,
      coachPaid: coach.paid,
      chatTokens: { remaining: chatRemaining, limit: limits.monthly.limit },
      // `allowed` et `monthlyUsed` servent à la jauge Studio du site : on doit
      // pouvoir distinguer « quota mensuel restant » et « tokens de packs »,
      // et savoir si le compte a droit au Studio (Pro / Expert / coach).
      studioTokens: {
        allowed: studio.allowed,
        remaining: studio.remaining,
        monthlyUsed: studio.monthlyUsed,
        monthlyLimit: studio.monthlyLimit,
        packTokens: studio.packTokens,
      },
    })
  } catch (e) {
    console.error('[account/summary] error:', e)
    return NextResponse.json({ loggedIn: true, error: 'summary_failed' }, { status: 200 })
  }
}
