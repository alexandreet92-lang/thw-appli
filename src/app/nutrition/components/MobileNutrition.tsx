'use client'
// ══════════════════════════════════════════════════════════════
// Nutrition — version mobile façon Strava. Frise des 7 jours, puis une carte
// par sujet : Aujourd'hui, Prochain repas, Repas du jour, Hydratation, Autour
// de ta séance, Mon plan, Suivi, Poids & composition. Tap → vue détail qui
// glisse de la droite. Les détails réutilisent les flux existants (journal des
// repas) ; Plan / Suivi / Composition ont leurs vues mobiles natives
// (./mobile/*) branchées sur les mêmes données et handlers que le bureau.
// ══════════════════════════════════════════════════════════════

import { useMemo, useRef, useState } from 'react'
import { useI18n, currentLocale } from '@/lib/i18n'
import { slotText, slotMacros, type MealSet, type NutritionPlan, type WeightLog } from '@/hooks/useNutrition'
import { SLOT_KEYS, type MealSlotKey, type useDailyMeals } from '@/hooks/useDailyMeals'
import type { useHydration } from '@/hooks/useHydration'
import type { PlannedSession } from '@/hooks/usePlanning'
import { useDaysTotals } from '@/hooks/useDaysTotals'
import { useDetailView } from '@/hooks/useDetailView'
import { usePushNav } from '@/hooks/usePushNav'
import { DashCard, Metric, MiniBars, Ring } from '@/components/dashboard/primitives'
import { DetailSlide } from '@/components/ui/DetailSlide'
import { SportIcon } from '@/components/icons/SportIcon'
import { sportColor } from '@/lib/agenda/types'
import { DayFoodJournal } from './DayFoodJournal'
import { CHARGE_COLOR, type DayType } from './plan/planFormat'
import { MobilePlanDetail, type MobilePlanDetailProps } from './mobile/MobilePlanDetail'
import { MobileSuiviDetail, type MobileSuiviDetailProps } from './mobile/MobileSuiviDetail'
import { MobileBodyDetail, type MobileBodyDetailProps } from './mobile/MobileBodyDetail'

type View = 'plan' | 'suivi' | 'body' | `meal:${MealSlotKey}`
type MealAction = { kind: 'ai' | 'manual' } | { kind: 'photo'; file: File }

const PLAN_SLOT: Record<MealSlotKey, keyof MealSet> = {
  breakfast: 'petit_dejeuner', morning_snack: 'collation_matin', lunch: 'dejeuner',
  afternoon_snack: 'collation_apres_midi', dinner: 'diner', evening_snack: 'collation_soir',
}
const SLOT_I18N: Record<MealSlotKey, string> = {
  breakfast: 'dashboard.mealBreakfast', morning_snack: 'dashboard.mealMorningSnack', lunch: 'dashboard.mealLunch',
  afternoon_snack: 'dashboard.mealAfternoonSnack', dinner: 'dashboard.mealDinner', evening_snack: 'dashboard.mealEveningSnack',
}
const NUM: React.CSSProperties = { fontVariantNumeric: 'tabular-nums', fontFeatureSettings: "'zero' 0" }
const I = (d: string) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
)
const IC = {
  kcal: I('M12 2c1 3 4 5 4 9a4 4 0 0 1-8 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 0-8z'),
  next: I('M12 8v4l3 3M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z'),
  meal: I('M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7'),
  water: I('M12 2.7 6.3 8.4a8 8 0 1 0 11.4 0z'),
  plan: I('M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM8 8h8M8 12h8M8 16h5'),
  trend: I('M3 3v18h18M7 16v-4M12 16V8M17 16v-7'),
  scale: I('M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2'),
}

function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const fmtInt = (n: number) => Math.round(n).toLocaleString(currentLocale())
const fmtKg = (n: number) => n.toLocaleString(currentLocale(), { maximumFractionDigits: 1, minimumFractionDigits: 1 })
const fmtL = (n: number) => n.toLocaleString(currentLocale(), { maximumFractionDigits: 2 })

function Spark({ values, width = 96, height = 48 }: { values: number[]; width?: number; height?: number }) {
  if (values.length < 2) return null
  const mn = Math.min(...values), mx = Math.max(...values), rg = mx - mn || 1
  const pts = values.map((v, i) => `${(3 + (i / (values.length - 1)) * (width - 6)).toFixed(1)},${(height - 4 - ((v - mn) / rg) * (height - 8)).toFixed(1)}`)
  const [lx, ly] = pts[pts.length - 1].split(',')
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline points={pts.join(' ')} fill="none" stroke="var(--primary)" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r={3.5} fill="var(--primary)" />
    </svg>
  )
}
function MacroLine({ label, value, target, color }: { label: string; value: number; target: number; color: string }) {
  const pct = target > 0 ? Math.min(1, value / target) : 0
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 5 }}>
        <b style={{ fontWeight: 600, color: 'var(--text)' }}>{label}</b>
        <span style={{ ...NUM, color: 'var(--text-mid)' }}>{Math.round(value)} / {Math.round(target)} g</span>
      </div>
      <div style={{ height: 8, borderRadius: 'var(--r-pill)', background: 'var(--bg-hover)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct * 100}%`, borderRadius: 'var(--r-pill)', background: color }} />
      </div>
    </div>
  )
}
const pillBtn: React.CSSProperties = {
  flex: 1, minWidth: 0, border: 'none', cursor: 'pointer', borderRadius: 'var(--r-pill)', padding: '10px 0', fontFamily: 'inherit',
  background: 'var(--dash-chip, var(--bg-hover))', color: 'var(--text)', fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap',
}

export interface MobileNutritionProps {
  today: string
  realToday: string
  onSelectDay: (d: string) => void
  todayType: DayType
  todayKcalObj: number
  todayMacroObj: { proteines: number; glucides: number; lipides: number }
  activePlan: NutritionPlan | null
  mealSet: MealSet | null
  dayMeals: ReturnType<typeof useDailyMeals>
  hydration: ReturnType<typeof useHydration>
  todaySessions: PlannedSession[]
  suivi7: { daysLogged: number; avgKcal: number | null; adherencePct: number | null; kcalByDay: number[] }
  weightLogs: WeightLog[]
  /** Vues détail natives : données + handlers (les mêmes que les onglets bureau). */
  planDetail: Omit<MobilePlanDetailProps, 'today' | 'realToday' | 'todayType' | 'todayKcalObj' | 'todayMacroObj' | 'todaySessions' | 'activePlan'>
  suiviDetail: MobileSuiviDetailProps
  bodyDetail: Omit<MobileBodyDetailProps, 'onGoToPlan'>
  onCreatePlan: () => void
}

export default function MobileNutrition(p: MobileNutritionProps) {
  const { t } = useI18n()
  const push = usePushNav()
  const [view, open, close] = useDetailView<View>()
  const [action, setAction] = useState<MealAction | undefined>(undefined)
  const photoRef = useRef<HTMLInputElement>(null)
  const photoSlot = useRef<MealSlotKey | null>(null)
  const { dayMeals, hydration } = p
  const planOn = !!p.activePlan

  const openMeal = (slot: MealSlotKey, a?: MealAction) => { setAction(a); open(`meal:${slot}`) }
  const entryFor = (slot: MealSlotKey) => dayMeals.entries.find(e => e.meal_slot === slot)
  const isLogged = (slot: MealSlotKey) => { const e = entryFor(slot); return !!e && (e.validated || (e.actual_kcal ?? 0) > 0) }
  const planned = (slot: MealSlotKey) => {
    const v = p.mealSet?.[PLAN_SLOT[slot]]
    const txt = v ? slotText(v).trim() : ''
    return txt && txt !== '-' ? { text: txt, macros: v ? slotMacros(v) : null } : null
  }
  const nextSlot = planOn ? SLOT_KEYS.find(k => !isLogged(k) && planned(k)) : undefined

  // ── Frise 7 jours ─────────────────────────────────────────────
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(p.realToday, i - 6)), [p.realToday])
  const totals = useDaysTotals(days)
  const strip = (
    <div style={{ background: 'var(--dash-card, var(--bg-card2))', borderRadius: 'var(--r-lg)', padding: '12px 8px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', textAlign: 'center' }}>
        {days.map(d => {
          const k = totals[d]?.kcal ?? 0
          const isToday = d === p.realToday, sel = d === p.today
          const pct = p.todayKcalObj > 0 ? k / p.todayKcalObj : 0
          const bar = k <= 0 ? 'var(--bg-hover)' : !planOn ? 'var(--primary)' : Math.abs(pct - 1) <= 0.15 ? 'var(--success)' : 'var(--charge-mid)'
          const abbr = new Date(d + 'T12:00:00').toLocaleDateString(currentLocale(), { weekday: 'narrow' })
          return (
            <button key={d} type="button" onClick={() => p.onSelectDay(d)} aria-pressed={sel}
              style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, fontFamily: 'inherit', minWidth: 0 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: isToday ? 'var(--text)' : 'var(--text-dim)', textTransform: 'uppercase' }}>{abbr}</span>
              <span style={{ ...NUM, width: 34, height: 34, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 16, fontWeight: 800,
                background: isToday ? 'var(--text)' : 'transparent', color: isToday ? 'var(--bg)' : 'var(--text)',
                boxShadow: sel && !isToday ? '0 0 0 2px var(--primary)' : 'none' }}>{Number(d.slice(8, 10))}</span>
              <span style={{ width: 30, height: 4, borderRadius: 'var(--r-pill)', background: bar }} />
            </button>
          )
        })}
      </div>
    </div>
  )

  // ── Vues détail ───────────────────────────────────────────────
  if (view) {
    let body: React.ReactNode
    if (view.startsWith('meal:')) {
      const slot = view.slice(5) as MealSlotKey
      const pl = planned(slot)
      body = <>
        <div className="nt-mdetail">
          <DayFoodJournal entries={dayMeals.entries} loading={dayMeals.loading} saveEntry={dayMeals.saveEntry} deleteEntry={dayMeals.deleteEntry}
            onlySlot={slot} initialAction={action} labels={Object.fromEntries(SLOT_KEYS.map(k => [k, t(SLOT_I18N[k])]))} />
        </div>
        {pl && (
          <DashCard icon={IC.plan} title={t('nutrition.m.plannedTitle')}>
            <p style={{ margin: 0, fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.4 }}>{pl.text}{pl.macros?.kcal ? ` · ${fmtInt(pl.macros.kcal)} kcal` : ''}</p>
          </DashCard>
        )}
      </>
    } else if (view === 'plan') {
      body = <MobilePlanDetail {...p.planDetail} activePlan={p.activePlan} today={p.today} realToday={p.realToday} todayType={p.todayType}
        todayKcalObj={p.todayKcalObj} todayMacroObj={p.todayMacroObj} todaySessions={p.todaySessions} />
    } else if (view === 'suivi') body = <MobileSuiviDetail {...p.suiviDetail} />
    else body = <MobileBodyDetail {...p.bodyDetail} onGoToPlan={() => open('plan')} />
    return (
      <div style={{ padding: '14px 16px 24px', fontFamily: 'var(--font-body)' }}>
        <DetailSlide backLabel={t('nutrition.title')} onBack={() => { setAction(undefined); close() }}>{body}</DetailSlide>
      </div>
    )
  }

  // ── Page principale ───────────────────────────────────────────
  const tot = dayMeals.totals
  const remaining = Math.max(0, p.todayKcalObj - tot.kcal)
  const dateMeta = new Date(p.today + 'T12:00:00').toLocaleDateString(currentLocale(), { weekday: 'short', day: 'numeric', month: 'short' })
  const typeLabel = t(`nutrition.m.type.${p.todayType}`)
  const loggedCount = SLOT_KEYS.filter(isLogged).length

  // Mon plan : 7 prochains jours (kcal cible + type de jour).
  const planData = p.activePlan?.plan_data
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(p.realToday, i)
    const j = planData?.jours?.find(x => x.date === d)
    const type = (j?.type_jour ?? null) as DayType | null
    const kc = j?.kcal ?? (type && planData ? planData[`calories_${type}`] : null) ?? 0
    return { kc, color: type ? CHARGE_COLOR[type] : 'var(--dash-bar, var(--border-mid))' }
  })

  // Poids : dernière mesure + écart sur ~3 mois.
  const wl = p.weightLogs.filter(w => w.weight_kg != null).sort((a, b) => a.measured_at.localeCompare(b.measured_at))
  const wLast = wl[wl.length - 1] ?? null
  const since = new Date(Date.now() - 92 * 86400000).toISOString()
  const wWin = wl.filter(w => w.measured_at >= since)
  const wDelta = wLast && wWin.length > 1 ? (wLast.weight_kg as number) - (wWin[0].weight_kg as number) : null
  const wDays = wLast ? Math.round((Date.now() - new Date(wLast.measured_at).getTime()) / 86400000) : 0

  const photoInput = (
    <input ref={photoRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
      onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f && photoSlot.current) openMeal(photoSlot.current, { kind: 'photo', file: f }) }} />
  )
  const actions = (slot: MealSlotKey) => (
    <div style={{ display: 'flex', gap: 8, marginTop: 12 }} onClick={e => e.stopPropagation()}>
      <button type="button" style={pillBtn} onClick={() => { photoSlot.current = slot; photoRef.current?.click() }}>{t('nutrition.m.photoAi')}</button>
      <button type="button" style={pillBtn} onClick={() => openMeal(slot, { kind: 'ai' })}>✦ IA</button>
      <button type="button" style={pillBtn} onClick={() => openMeal(slot, { kind: 'manual' })}>+ {t('nutrition.m.manual')}</button>
    </div>
  )

  const session = p.todaySessions[0]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '14px 16px 24px', fontFamily: 'var(--font-body)' }}>
      {photoInput}
      {strip}

      {planOn ? (
        <DashCard icon={IC.kcal} title={p.today === p.realToday ? t('dashboard.today') : dateMeta} meta={typeLabel}>
          <Metric label={t('nutrition.m.consumed')} value={fmtInt(tot.kcal)} unit={`/ ${fmtInt(p.todayKcalObj)} kcal`}
            sub={t('nutrition.m.remaining', { n: fmtInt(remaining) })} right={<Ring value={p.todayKcalObj > 0 ? tot.kcal / p.todayKcalObj : 0} />} />
          <MacroLine label={t('nutrition.macro.proteins')} value={tot.prot} target={p.todayMacroObj.proteines} color="var(--macro-prot)" />
          <MacroLine label={t('nutrition.macro.carbs')} value={tot.gluc} target={p.todayMacroObj.glucides} color="var(--macro-gluc)" />
          <MacroLine label={t('nutrition.macro.fats')} value={tot.lip} target={p.todayMacroObj.lipides} color="var(--macro-lip)" />
        </DashCard>
      ) : (
        <DashCard icon={IC.kcal} title={p.today === p.realToday ? t('dashboard.today') : dateMeta} meta={p.today === p.realToday ? dateMeta : undefined}>
          <Metric label={t('nutrition.m.consumed')} value={fmtInt(tot.kcal)} unit="kcal"
            sub={`P ${Math.round(tot.prot)} g · G ${Math.round(tot.gluc)} g · L ${Math.round(tot.lip)} g`} />
        </DashCard>
      )}

      {planOn ? (nextSlot && p.today === p.realToday && (() => {
        const pl = planned(nextSlot)!
        return (
          <DashCard icon={IC.next} title={t('nutrition.m.nextMeal')} meta={t('nutrition.m.plan')} onOpen={() => openMeal(nextSlot)}>
            <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>{t(SLOT_I18N[nextSlot])}</p>
            <p style={{ margin: '2px 0 0', fontSize: 15, color: 'var(--text-mid)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{pl.text}</p>
            {pl.macros && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                {[[`${fmtInt(pl.macros.kcal)}`, 'kcal'], ['P', `${Math.round(pl.macros.proteines)} g`], ['G', `${Math.round(pl.macros.glucides)} g`]].map(([a, b]) => (
                  <span key={a + b} style={{ ...NUM, padding: '6px 10px', borderRadius: 'var(--r-pill)', background: 'var(--dash-chip, var(--bg-hover))', fontSize: 13, fontWeight: 600, color: 'var(--text-mid)' }}>{a} <b style={{ color: 'var(--text)' }}>{b}</b></span>
                ))}
              </div>
            )}
            {actions(nextSlot)}
          </DashCard>
        )
      })()) : (
        <DashCard icon={IC.plan} title={t('nutrition.m.noPlanTitle')}>
          <p style={{ margin: '0 0 12px', fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.4 }}>{t('nutrition.m.noPlanHint')}</p>
          <button type="button" onClick={p.onCreatePlan} className="thw-press"
            style={{ width: '100%', minHeight: 50, borderRadius: 'var(--r-pill)', border: 'none', background: 'var(--primary)', color: 'var(--on-primary)', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            {t('nutrition.m.createPlan')}
          </button>
        </DashCard>
      )}

      <DashCard icon={IC.meal} title={t('nutrition.today.dayMeals')} meta={`${loggedCount} / ${SLOT_KEYS.length}`}>
        {SLOT_KEYS.map((slot, i) => {
          const e = entryFor(slot), done = isLogged(slot), pl = planned(slot)
          const desc = done ? (e?.meal_name ?? '') : pl ? t('nutrition.m.plannedShort', { text: pl.text }) : '—'
          const kc = done ? e?.actual_kcal ?? 0 : pl?.macros?.kcal ?? null
          return (
            <button key={slot} type="button" onClick={() => openMeal(slot)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', border: 'none', borderTop: i ? '1px solid var(--dash-line, var(--border))' : 'none', background: 'none', padding: i ? '12px 0' : '0 0 12px', cursor: 'pointer', fontFamily: 'inherit' }}>
              <span aria-hidden style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, display: 'grid', placeItems: 'center', fontSize: 15, fontWeight: 800,
                background: done ? 'var(--success)' : 'var(--dash-chip, var(--bg-hover))', color: done ? 'var(--on-primary)' : 'var(--text-mid)' }}>{done ? '✓' : '+'}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <b style={{ display: 'block', fontSize: 15, color: 'var(--text)' }}>{t(SLOT_I18N[slot])}</b>
                <span style={{ display: 'block', fontSize: 13, color: 'var(--text-mid)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{desc}</span>
              </span>
              {kc != null && kc > 0 && <span style={{ ...NUM, fontSize: 15, fontWeight: done ? 700 : 600, color: done ? 'var(--text)' : 'var(--text-dim)' }}>{fmtInt(kc)}</span>}
            </button>
          )
        })}
      </DashCard>

      <DashCard icon={IC.water} title={t('nutrition.today.hydration')}>
        <Metric value={fmtL(hydration.liters)} unit="/ 2,5 L" right={<Ring value={Math.min(1, hydration.liters / 2.5)} color="var(--rec-hrv)" size={56} />} />
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button type="button" style={pillBtn} onClick={() => void hydration.addLiters(0.25)}>+25 cl</button>
          <button type="button" style={pillBtn} onClick={() => void hydration.addLiters(0.5)}>+50 cl</button>
          <button type="button" style={pillBtn} onClick={() => void hydration.setLiters(Math.max(0, hydration.liters - 0.25))}>−25 cl</button>
        </div>
      </DashCard>

      {session && (
        <DashCard icon={<SportIcon sport={session.sport} size={22} circle={false} />} title={t('nutrition.today.aroundSession')} meta={session.time || undefined} onOpen={() => push('/planning')}>
          <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>
            {session.title}{' '}
            <span style={{ ...NUM, marginLeft: 6, fontSize: 14, fontWeight: 700, color: sportColor(session.sport) }}>
              {[session.duration_min ? `${session.duration_min} min` : null, session.rpe != null ? `RPE ${session.rpe}` : null].filter(Boolean).join(' · ')}
            </span>
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 15, color: 'var(--text-mid)' }}>{t('nutrition.m.sessionTip')}</p>
        </DashCard>
      )}

      {planOn && (
        <DashCard icon={IC.plan} title={t('nutrition.m.myPlan')} onOpen={() => open('plan')}>
          <Metric label={t('nutrition.m.targetToday')} value={fmtInt(p.todayKcalObj)} unit="kcal" chip={t(`nutrition.m.typeShort.${p.todayType}`)} chipColor={CHARGE_COLOR[p.todayType]}
            sub={t('nutrition.m.next7')} right={<MiniBars values={week.map(w => w.kc)} highlight={0} />} />
        </DashCard>
      )}
    
      <DashCard icon={IC.trend} title={t('nutrition.m.suivi')} onOpen={() => open('suivi')}>
        <Metric label={t('nutrition.m.avg7')} value={p.suivi7.avgKcal != null ? fmtInt(p.suivi7.avgKcal) : '—'} unit="kcal"
          sub={t('nutrition.m.daysLogged', { n: p.suivi7.daysLogged })} right={<MiniBars values={p.suivi7.kcalByDay} highlight={6} />} />
      </DashCard>

      <DashCard icon={IC.scale} title={t('nutrition.m.body')} meta={wDelta != null ? t('nutrition.m.threeMonths') : undefined} onOpen={() => open('body')}>
        {wLast ? (
          <Metric label={t('nutrition.m.lastMeasure')} value={fmtKg(wLast.weight_kg as number)} unit="kg"
            {...(wDelta != null && Math.abs(wDelta) >= 0.1 ? { chip: `${wDelta > 0 ? '▲' : '▼'} ${fmtKg(Math.abs(wDelta))} kg`, chipColor: 'var(--text-mid)' } : {})}
            sub={[wLast.fat_mass_percent != null ? `MG ${fmtKg(wLast.fat_mass_percent)} %` : null, wDays === 0 ? t('dashboard.today') : t('nutrition.m.daysAgo', { n: wDays })].filter(Boolean).join(' · ')}
            right={wWin.length > 1 ? <Spark values={wWin.map(w => w.weight_kg as number)} /> : undefined} />
        ) : (
          <p style={{ margin: 0, fontSize: 15, color: 'var(--text-mid)' }}>{t('nutrition.m.noWeight')}</p>
        )}
      </DashCard>
    </div>
  )
}
