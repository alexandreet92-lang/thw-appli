// ══════════════════════════════════════════════════════════════
// Auto-adaptation du plan nutrition aux changements d'entraînement.
//
// Plan VIVANT : quand une séance d'un jour change (ajout / modif / suppr),
// on recalcule la « charge » du jour (TSS), on en déduit un palier
// (low | mid | hard) et — SEULEMENT si le palier change ET que l'écart
// calorique est significatif — on réécrit ce jour dans le plan actif et on
// crée une notification. Déterministe, instantané, sans appel IA.
//
// Le plan reste l'objet maître ; on ne touche QUE le jour impacté.
// Fail-open : toute erreur renvoie { changed:false }, jamais bloquant.
// ══════════════════════════════════════════════════════════════

/* eslint-disable @typescript-eslint/no-explicit-any */

// Seuils (ajustables). Palier de charge du jour à partir du TSS cumulé.
const TIER_MID_TSS = 25    // ≤ 25 → low (repos / léger)
const TIER_HARD_TSS = 70   // ≤ 70 → mid ; > 70 → hard
// On n'agit que si le réajustement calorique dépasse ce seuil (vrai changement).
const MIN_KCAL_DELTA = 200

type Tier = 'low' | 'mid' | 'hard'

interface SessionRow { tss: number | null; duration_min: number | null; intensity: string | null }

// TSS estimé quand la séance n'en porte pas (≈ charge/min selon l'intensité).
function estimateTss(s: SessionRow): number {
  if (typeof s.tss === 'number' && s.tss > 0) return s.tss
  const dur = s.duration_min ?? 0
  if (dur <= 0) return 0
  const i = (s.intensity ?? '').toLowerCase()
  let perMin = 1.0
  if (/recup|recovery|repos|easy|z1/.test(i)) perMin = 0.5
  else if (/endurance|fond|low|z2/.test(i)) perMin = 0.8
  else if (/tempo|mid|sweet|z3/.test(i)) perMin = 1.2
  else if (/seuil|threshold|hard|z4/.test(i)) perMin = 1.5
  else if (/pma|vo2|max|z5|intervalle|fractionn/.test(i)) perMin = 1.7
  return Math.round(dur * perMin)
}

function tierFromTss(totalTss: number): Tier {
  if (totalTss <= TIER_MID_TSS) return 'low'
  if (totalTss <= TIER_HARD_TSS) return 'mid'
  return 'hard'
}

function addDaysISO(weekStart: string, n: number): string {
  const d = new Date(`${weekStart}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

const DAY_LABELS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
const TIER_LABELS: Record<Tier, string> = { low: 'jour léger', mid: 'jour modéré', hard: 'jour intense' }

interface MacroSet { proteines?: number; glucides?: number; lipides?: number }

const MEAL_SLOTS = ['petit_dejeuner', 'collation_matin', 'dejeuner', 'collation_apres_midi', 'diner', 'collation_soir']

// Met à l'échelle les portions des repas d'un jour par un ratio (déterministe,
// instantané) : les plats restent les mêmes, les quantités montent/descendent.
function scaleMeals(jour: any, ratio: number): void {
  if (!isFinite(ratio) || ratio <= 0 || Math.abs(ratio - 1) < 0.02) return
  const repas = jour?.repas
  if (!repas || typeof repas !== 'object') return
  for (const optKey of ['option_A', 'option_B']) {
    const opt = repas[optKey]
    if (!opt || typeof opt !== 'object') continue
    for (const slot of MEAL_SLOTS) {
      const meal = opt[slot]
      if (!meal || typeof meal !== 'object') continue
      for (const k of ['kcal', 'proteines', 'glucides', 'lipides']) {
        if (typeof meal[k] === 'number') meal[k] = Math.round(meal[k] * ratio)
      }
    }
  }
}

// Applique le palier `tier` à un objet "jour" du plan, en lisant les jeux
// calories_<tier> / macros_<tier> du variant. Met aussi à l'échelle les repas.
function applyTierToDay(variant: any, jour: any, tier: Tier): { oldKcal: number; newKcal: number; oldG: number; newG: number } {
  const oldKcal = Number(jour.kcal) || 0
  const oldG = Number(jour.glucides) || 0
  const newKcal = Number(variant?.[`calories_${tier}`]) || oldKcal
  const macros: MacroSet = variant?.[`macros_${tier}`] ?? {}
  jour.type_jour = tier
  if (newKcal) jour.kcal = newKcal
  if (typeof macros.proteines === 'number') jour.proteines = macros.proteines
  if (typeof macros.glucides === 'number') jour.glucides = macros.glucides
  if (typeof macros.lipides === 'number') jour.lipides = macros.lipides
  // Phase 2 : les repas suivent le nouveau total (portions ajustées au prorata)
  if (oldKcal > 0 && newKcal > 0) scaleMeals(jour, newKcal / oldKcal)
  jour.adapted = true   // marque : ce jour a été réajusté automatiquement
  return { oldKcal, newKcal, oldG, newG: Number(jour.glucides) || 0 }
}

/**
 * Recalcule le plan nutrition pour un jour donné (week_start + day_index)
 * en fonction des séances actuelles de ce jour. Retourne ce qui a changé.
 */
export async function syncNutritionForDate(
  sb: any,
  userId: string,
  weekStart: string,
  dayIndex: number,
): Promise<{ changed: boolean }> {
  try {
    const date = addDaysISO(weekStart, dayIndex)

    // 1) Séances du jour → TSS cumulé → palier visé
    const { data: sessions } = await sb
      .from('planned_sessions')
      .select('tss, duration_min, intensity')
      .eq('user_id', userId)
      .eq('week_start', weekStart)
      .eq('day_index', dayIndex)
    const totalTss = (sessions ?? []).reduce((s: number, r: SessionRow) => s + estimateTss(r), 0)
    const newTier = tierFromTss(totalTss)

    // 2) Plan nutrition actif
    const { data: plan } = await sb
      .from('nutrition_plans')
      .select('id, plan_data')
      .eq('user_id', userId)
      .eq('actif', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!plan?.plan_data) return { changed: false }

    const planData = plan.plan_data as any
    const variants = ['plan_minimal', 'plan_maximal'].filter(k => planData[k]?.jours)
    if (variants.length === 0) return { changed: false }

    // 3) Le jour est-il dans le plan ? Quel est son palier actuel ?
    let oldTier: Tier | null = null
    for (const vk of variants) {
      const jour = (planData[vk].jours as any[]).find(j => j.date === date)
      if (jour?.type_jour) { oldTier = jour.type_jour as Tier; break }
    }
    if (!oldTier || oldTier === newTier) return { changed: false }   // pas de changement de palier

    // 4) Changement significatif ? (écart kcal)
    let applied: { oldKcal: number; newKcal: number; oldG: number; newG: number } | null = null
    for (const vk of variants) {
      const jour = (planData[vk].jours as any[]).find(j => j.date === date)
      if (!jour) continue
      const res = applyTierToDay(planData[vk], jour, newTier)
      if (!applied) applied = res
    }
    if (!applied || Math.abs(applied.newKcal - applied.oldKcal) < MIN_KCAL_DELTA) {
      return { changed: false }   // ajustement trop faible → on ne dérange pas
    }

    // 5) Persiste le plan modifié (jour impacté uniquement)
    const { error: upErr } = await sb
      .from('nutrition_plans')
      .update({ plan_data: planData })
      .eq('id', plan.id)
    if (upErr) { console.error('[adapt] update plan:', upErr); return { changed: false } }

    // 6) Notification (dédupliquée par jour : on remplace une non-lue du même jour)
    const dedupKey = `nutri:${date}`
    const dir = applied.newKcal > applied.oldKcal ? 'plus exigeant' : 'plus léger'
    const kcalDelta = Math.round(applied.newKcal - applied.oldKcal)
    const gDelta = Math.round(applied.newG - applied.oldG)
    const dayLabel = DAY_LABELS[dayIndex] ?? date
    const body =
      `Ta journée de ${dayLabel} est devenue un ${TIER_LABELS[newTier]} (entraînement ${dir}). ` +
      `Objectif ajusté : ${applied.newKcal} kcal (${kcalDelta > 0 ? '+' : ''}${kcalDelta}), ` +
      `glucides ${kcalDelta > 0 ? '+' : ''}${gDelta} g.`

    await sb.from('notifications').delete().eq('user_id', userId).eq('dedup_key', dedupKey).eq('read', false)
    await sb.from('notifications').insert({
      user_id: userId,
      type: 'nutrition_adapt',
      title: '⚡ Plan nutrition ajusté',
      body,
      link: '/nutrition',
      dedup_key: dedupKey,
    })

    return { changed: true }
  } catch (e) {
    console.error('[adapt] syncNutritionForDate error:', e)
    return { changed: false }
  }
}
