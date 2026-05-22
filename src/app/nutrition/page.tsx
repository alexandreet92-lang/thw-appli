'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import dynamicImport from 'next/dynamic'
import { Button } from '@/components/ui/Button'
import { MacroDonut } from '@/components/ui/MacroDonut'
import { useNutrition, useNutritionTemplates, type MealTemplate } from '@/hooks/useNutrition'
import { usePlanning, type PlannedSession } from '@/hooks/usePlanning'
import { useMealLogs, type MealLog } from '@/hooks/useMealLogs'
import type { NutritionPlanData, PlanDay, MealSet, MealSlotValue, DailyLog } from '@/hooks/useNutrition'
import { slotText, slotMacros } from '@/hooks/useNutrition'
import WeightSection from './components/WeightSection'
import KcalBarChart from './components/KcalBarChart'
import MacrosLineChart from './components/MacrosLineChart'
import MealTypesSection from './components/MealTypesSection'
import HabitudesSection from './components/HabitudesSection'
import { useNutritionHabits } from '@/hooks/useNutritionHabits'
import MealSlotGrid from './components/MealSlotGrid'
import ToastContainer from './components/ToastContainer'
import { useToast } from '@/hooks/useToast'
import { useDailyMeals } from '@/hooks/useDailyMeals'
import { useMealLogRange } from '@/hooks/useMealLogRange'
const AIPanel = dynamicImport(() => import('@/components/ai/AIPanel'), { ssr: false })

// ══════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════
type DayType   = 'low' | 'mid' | 'hard'
type HistRange = '7j' | '14j' | '28j'
type DataFilter   = 'kcal' | 'proteines' | 'glucides' | 'lipides' | 'macros' | 'micros'
type MealKey      = 'petit_dejeuner' | 'collation_matin' | 'dejeuner' | 'collation_apres_midi' | 'diner' | 'collation_soir'
type PlanVariant  = 'A' | 'B'

// ══════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════
const DAY_COLORS: Record<DayType, { bg: string; border: string; text: string; label: string }> = {
  low:  { bg: 'rgba(34,197,94,0.10)',  border: '#22c55e', text: '#22c55e',  label: 'Jour Low'  },
  mid:  { bg: 'rgba(234,179,8,0.10)',  border: '#eab308', text: '#eab308',  label: 'Jour Mid'  },
  hard: { bg: 'rgba(239,68,68,0.10)',  border: '#ef4444', text: '#ef4444',  label: 'Jour Hard' },
}

const MEAL_LABELS: Record<MealKey, string> = {
  petit_dejeuner:       'Petit-dejeuner',
  collation_matin:      'Collation matin',
  dejeuner:             'Dejeuner',
  collation_apres_midi: 'Collation apres-midi',
  diner:                'Diner',
  collation_soir:       'Collation soir',
}

const MEAL_KEYS: MealKey[] = [
  'petit_dejeuner',
  'collation_matin',
  'dejeuner',
  'collation_apres_midi',
  'diner',
  'collation_soir',
]

function computeDayType(sessions: PlannedSession[]): DayType {
  if (!sessions.length) return 'low'
  const s = sessions[0]
  const dur = s.duration_min ?? 0
  const intensity = s.intensity ?? ''
  if (
    intensity === 'hard' ||
    intensity === 'compet' ||
    dur > 120 ||
    (s.tss !== undefined && s.tss !== null && s.tss > 80)
  ) return 'hard'
  if (intensity === 'recovery' || (dur < 45 && !intensity)) return 'low'
  return 'mid'
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
  return `${days[d.getDay()]} ${d.getDate()}`
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

// ══════════════════════════════════════════════════════════════════
// SVG COMPONENTS
// ══════════════════════════════════════════════════════════════════

function KcalGauge({ consumed, objective }: { consumed: number; objective: number }) {
  const pct = objective > 0 ? Math.min(consumed / objective, 1) : 0
  const r = 52
  const stroke = 8
  const circ = 2 * Math.PI * r
  const dash = pct * circ
  const color = pct > 1.05 ? '#ef4444' : pct > 0.9 ? '#22c55e' : '#00c8e0'
  return (
    <svg width={130} height={130} viewBox="0 0 130 130">
      <circle cx={65} cy={65} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
      <circle
        cx={65} cy={65} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeDashoffset={circ / 4}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
      <text x={65} y={60} textAnchor="middle" fill="var(--text)" fontSize={20} fontFamily="Syne,sans-serif" fontWeight={700}>
        {Math.round(consumed)}
      </text>
      <text x={65} y={78} textAnchor="middle" fill="var(--text-dim)" fontSize={11} fontFamily="DM Sans,sans-serif">
        {`/ ${Math.round(objective)} kcal`}
      </text>
    </svg>
  )
}

function MacroBar({ label, consumed, objective, color }: { label: string; consumed: number; objective: number; color: string }) {
  const pct = objective > 0 ? Math.min(consumed / objective, 1) : 0
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--text-mid)' }}>{label}</span>
        <span style={{ fontSize: 11, fontFamily: 'DM Mono,monospace', color }}>
          {Math.round(consumed)}g / {Math.round(objective)}g
        </span>
      </div>
      <svg width="100%" height={6} style={{ borderRadius: 3, display: 'block' }}>
        <rect x={0} y={0} width="100%" height={6} fill="var(--border)" rx={3} />
        <rect x={0} y={0} width={`${pct * 100}%`} height={6} fill={color} rx={3}
          style={{ transition: 'width 0.5s ease' }} />
      </svg>
    </div>
  )
}

// KcalHistoryChart and MacrosChart extracted to ./components/KcalBarChart.tsx and ./components/MacrosLineChart.tsx

/** Returns the ISO date of the Monday of the week at the given offset (0 = current week) */
function getWeekStart(offset: number): string {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const daysSinceMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const mon = new Date(today)
  mon.setDate(today.getDate() - daysSinceMon + offset * 7)
  return mon.toISOString().split('T')[0]
}


// ══════════════════════════════════════════════════════════════════
// SECTION STYLES
// ══════════════════════════════════════════════════════════════════
const cardStyle: React.CSSProperties = {
  background: 'var(--bg-card)',
  borderRadius: 16,
  border: '1px solid var(--border)',
  padding: '20px 20px',
  marginBottom: 16,
}

const sectionTitle: React.CSSProperties = {
  fontFamily: 'Syne,sans-serif',
  fontWeight: 700,
  fontSize: 16,
  color: 'var(--text)',
  marginBottom: 16,
  marginTop: 0,
}

// Meal templates section extracted to ./components/MealTypesSection.tsx

// ══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════
export default function NutritionPage() {
  const today = new Date().toISOString().split('T')[0]

  const { activePlan, dailyLogs, loading: nutLoading, saveDailyLog } = useNutrition()
  const { templates, loading: templatesLoading, addTemplate, updateTemplate, deleteTemplate } = useNutritionTemplates()
  const { habits, loading: habitsLoading, addHabit, updateHabit, deleteHabit } = useNutritionHabits()
  const { sessions } = usePlanning()

  // ── Toast system ───────────────────────────────────────────────
  const { toasts, showToast, dismissToast } = useToast()

  // ── MealSlotGrid totals for Bilan du jour ─────────────────────
  const { totals: todaySlotTotals, reload: reloadTodaySlots } = useDailyMeals(today)

  // ── State ──────────────────────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState<string>(today)
  const [planVariant, setPlanVariant] = useState<PlanVariant>('A')
  const [histRange, setHistRange] = useState<HistRange>('7j')
  const [weekOffset, setWeekOffset] = useState<number>(0)
  const [dataFilters, setDataFilters] = useState<DataFilter[]>(['kcal'])
  const [dayDetailOpen, setDayDetailOpen] = useState<PlanDay | null>(null)
  const [savingLog, setSavingLog] = useState<boolean>(false)
  const [manualMeals, setManualMeals] = useState<Partial<Record<MealKey, string>>>({})
  const [manualKcal, setManualKcal] = useState<string>('')
  const [manualP, setManualP] = useState<string>('')
  const [manualG, setManualG] = useState<string>('')
  const [manualL, setManualL] = useState<string>('')
  const [aiPanelOpen, setAiPanelOpen] = useState(false)
  const [aiPrompt, setAiPrompt] = useState<string>('')
  const [isDesktop, setIsDesktop] = useState(false)
  // edit sub-modal: which meal slot is being edited + form values
  const [editSlot, setEditSlot] = useState<MealKey | null>(null)
  const [editDesc, setEditDesc] = useState('')
  const [editKcal, setEditKcal] = useState('')
  const [editProt, setEditProt] = useState('')
  const [editGluc, setEditGluc] = useState('')
  const [editLip, setEditLip] = useState('')

  // ── Desktop breakpoint ─────────────────────────────────────────
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // ── Historique date range for combined meal log totals ────────
  const histDays      = histRange === '7j' ? 7 : histRange === '14j' ? 14 : 28
  const histStartDate = histRange === '7j' ? getWeekStart(weekOffset) : addDays(today, -(histDays - 1))
  const histEndDate   = addDays(histStartDate, histDays - 1)
  const { totals: mealLogTotals } = useMealLogRange(histStartDate, histEndDate)

  // ── Meal logs for today (Bilan du jour) ───────────────────────
  const { logs: todayMealLogs, reload: reloadTodayLogs } = useMealLogs(activePlan?.id, today)

  // ── Meal logs for the open day detail modal ───────────────────
  const modalDate = dayDetailOpen?.date ?? ''
  const {
    logs: modalMealLogs,
    toggleValidated: _modalToggleValidated,
    updateLog: modalUpdateLog,
  } = useMealLogs(activePlan?.id, modalDate)

  // Wrapper : si on valide un repas pour aujourd'hui depuis la modal,
  // on rafraîchit aussi le hook Bilan du jour (instances séparées).
  // Si validation (et non dé-validation) + texte du repas fourni,
  // on estime les macros via Haiku et on les sauvegarde.
  const modalToggleValidated = useCallback(async (
    slot: string,
    validated: boolean,
    mealText?: string,
  ) => {
    await _modalToggleValidated(slot, validated)

    if (validated && mealText && mealText.trim() !== '-') {
      // Ne ré-estime pas si l'user a déjà saisi ses propres macros
      const existingLog = modalMealLogs.find(l => l.meal_slot === slot)
      if (!existingLog?.actual_kcal) {
        try {
          const res = await fetch('/api/estimate-meal-macros', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ description: mealText }),
          })
          if (res.ok) {
            const r = await res.json() as { kcal: number; proteines: number; glucides: number; lipides: number }
            await modalUpdateLog(slot, {
              actual_kcal: r.kcal,
              actual_prot: r.proteines,
              actual_gluc: r.glucides,
              actual_lip:  r.lipides,
            })
          }
        } catch (err) {
          console.error('[modalToggleValidated] estimate failed:', err)
        }
      }
    }

    if (modalDate === today) void reloadTodayLogs()
  }, [_modalToggleValidated, modalUpdateLog, modalMealLogs, modalDate, today, reloadTodayLogs])

  // ── Today's data ───────────────────────────────────────────────
  const todaySessions = sessions.filter(s => {
    const dow = new Date(today + 'T00:00:00').getDay()
    const dayIndex = dow === 0 ? 6 : dow - 1
    return s.day_index === dayIndex
  })
  const todayType = computeDayType(todaySessions)
  const todayPlanDay = activePlan?.plan_data?.jours?.find(j => j.date === today) ?? null

  const todayKcalObj = todayPlanDay?.kcal ?? (
    todayType === 'hard' ? activePlan?.plan_data?.calories_hard :
    todayType === 'mid'  ? activePlan?.plan_data?.calories_mid  :
                           activePlan?.plan_data?.calories_low
  ) ?? 0

  const todayMacroObj = todayPlanDay
    ? { proteines: todayPlanDay.proteines, glucides: todayPlanDay.glucides, lipides: todayPlanDay.lipides }
    : (
        todayType === 'hard' ? activePlan?.plan_data?.macros_hard :
        todayType === 'mid'  ? activePlan?.plan_data?.macros_mid  :
                               activePlan?.plan_data?.macros_low
      ) ?? { proteines: 0, glucides: 0, lipides: 0 }

  const todayLog = dailyLogs.find(l => l.date === today)

  // ── Totaux validés — 3 niveaux de précision ─────────────────────
  // 1. actual_* saisi par l'user (précision maximale)
  // 2. macros du plan par slot   (nouveaux plans IA avec objets)
  // 3. total journée ÷ nb slots  (anciens plans string, fallback visuel)
  function slotFallback(
    mealLogs: MealLog[],
    dayKcal: number,
    dayProt: number,
    dayGluc: number,
    dayLip: number,
    mealSetRef: MealSet | null,
  ) {
    const activeSlots = mealSetRef
      ? MEAL_KEYS.filter(k => slotText(mealSetRef[k]) !== '-').length || 1
      : MEAL_KEYS.length
    const perSlot = {
      kcal: dayKcal / activeSlots,
      prot: dayProt / activeSlots,
      gluc: dayGluc / activeSlots,
      lip:  dayLip  / activeSlots,
    }
    return mealLogs
      .filter(l => l.validated)
      .reduce(
        (acc, l) => {
          const planSlot = mealSetRef
            ? slotMacros(mealSetRef[l.meal_slot as MealKey] as MealSlotValue)
            : null
          return {
            kcal: acc.kcal + (l.actual_kcal ?? planSlot?.kcal       ?? perSlot.kcal),
            prot: acc.prot + (l.actual_prot ?? planSlot?.proteines   ?? perSlot.prot),
            gluc: acc.gluc + (l.actual_gluc ?? planSlot?.glucides    ?? perSlot.gluc),
            lip:  acc.lip  + (l.actual_lip  ?? planSlot?.lipides     ?? perSlot.lip),
          }
        },
        { kcal: 0, prot: 0, gluc: 0, lip: 0 },
      )
  }

  const todayMealSet = todayPlanDay
    ? (planVariant === 'A' ? todayPlanDay.repas.option_A : todayPlanDay.repas.option_B)
    : null
  const todayMealTotals = slotFallback(
    todayMealLogs,
    todayKcalObj,
    todayMacroObj.proteines,
    todayMacroObj.glucides,
    todayMacroObj.lipides,
    todayMealSet,
  )

  // ── Combined bilan (plan-based + manual slot entries) ──────────
  const bilanTotals = {
    kcal: todayMealTotals.kcal + todaySlotTotals.kcal,
    prot: todayMealTotals.prot + todaySlotTotals.prot,
    gluc: todayMealTotals.gluc + todaySlotTotals.gluc,
    lip:  todayMealTotals.lip  + todaySlotTotals.lip,
  }

  // ── Selected date data ─────────────────────────────────────────
  const selectedPlanDay = activePlan?.plan_data?.jours?.find(j => j.date === selectedDate) ?? null
  const selectedLog = dailyLogs.find(l => l.date === selectedDate)

  // ── Toggle meal consumed ───────────────────────────────────────
  const handleMealToggle = useCallback(async (mealKey: MealKey, consumed: boolean) => {
    const log = todayLog ?? {
      date: today,
      kcal_consommees: 0,
      proteines: 0,
      glucides: 0,
      lipides: 0,
      repas_details: {} as Record<string, { consumed: boolean; note?: string }>,
      option_choisie: planVariant as 'A' | 'B' | 'manuel',
    }
    const updated: DailyLog = {
      ...log,
      repas_details: {
        ...log.repas_details,
        [mealKey]: { consumed },
      },
    }
    setSavingLog(true)
    await saveDailyLog(updated)
    setSavingLog(false)
  }, [todayLog, today, planVariant, saveDailyLog])

  // Weight section handled by <WeightSection /> component

  // ── Save manual log ────────────────────────────────────────────
  const handleSaveManualLog = useCallback(async () => {
    const log: Omit<DailyLog, 'id'> = {
      date: selectedDate,
      kcal_consommees: parseFloat(manualKcal) || 0,
      proteines: parseFloat(manualP) || 0,
      glucides: parseFloat(manualG) || 0,
      lipides: parseFloat(manualL) || 0,
      repas_details: selectedLog?.repas_details ?? {},
      option_choisie: 'manuel',
    }
    setSavingLog(true)
    await saveDailyLog(log)
    setSavingLog(false)
    setManualKcal('')
    setManualP('')
    setManualG('')
    setManualL('')
  }, [selectedDate, manualKcal, manualP, manualG, manualL, selectedLog, saveDailyLog])

  // ── Loading ────────────────────────────────────────────────────
  if (nutLoading) {
    return <div style={{ padding: 24, color: 'var(--text-dim)' }}>Chargement...</div>
  }

  // ── 14-day dates ───────────────────────────────────────────────
  const next14Days = Array.from({ length: 14 }, (_, i) => addDays(today, i))

  return (
    <>
    <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    <div style={{ padding: '0 0 80px' }}>
      {/* ── HEADER ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 0' }}>
        <h1 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 24, margin: 0 }}>Nutrition</h1>
      </div>

      <div style={{ padding: '16px 16px 0' }}>

        {/* ══════════════════════════════════════════════════════ */}
        {/* SECTION 1 — Bilan du jour                             */}
        {/* ══════════════════════════════════════════════════════ */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <p style={sectionTitle}>Bilan du jour</p>
            <div style={{
              padding: '4px 10px',
              borderRadius: 8,
              background: DAY_COLORS[todayType].bg,
              border: `1px solid ${DAY_COLORS[todayType].border}`,
              color: DAY_COLORS[todayType].text,
              fontSize: 11,
              fontFamily: 'Syne,sans-serif',
              fontWeight: 700,
            }}>
              {DAY_COLORS[todayType].label}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'space-around', flexWrap: 'wrap' }}>
            <MacroDonut
              label="Calories"
              consumed={bilanTotals.kcal}
              objective={todayKcalObj}
              unit="kcal"
              color="#00c8e0"
              size={96}
            />
            <MacroDonut
              label="Proteines"
              consumed={bilanTotals.prot}
              objective={todayMacroObj.proteines}
              unit="g"
              color="#22c55e"
              size={96}
            />
            <MacroDonut
              label="Glucides"
              consumed={bilanTotals.gluc}
              objective={todayMacroObj.glucides}
              unit="g"
              color="#eab308"
              size={96}
            />
            <MacroDonut
              label="Lipides"
              consumed={bilanTotals.lip}
              objective={todayMacroObj.lipides}
              unit="g"
              color="#f97316"
              size={96}
            />
          </div>
          {!activePlan && (
            <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 12, textAlign: 'center' }}>
              Aucun plan actif — créez un plan pour voir vos objectifs.
            </p>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════ */}
        {/* SECTION 2 — Seance du jour                            */}
        {/* ══════════════════════════════════════════════════════ */}
        <div style={cardStyle}>
          <p style={sectionTitle}>Seance du jour</p>
          {todaySessions.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: 0 }}>Jour de repos</p>
          ) : (
            todaySessions.map(s => (
              <div key={s.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 12px',
                borderRadius: 10,
                background: 'var(--bg-card2)',
                border: '1px solid var(--border)',
                marginBottom: 8,
              }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: 'rgba(0,200,224,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'Syne,sans-serif',
                  fontWeight: 700,
                  fontSize: 11,
                  color: '#00c8e0',
                  flexShrink: 0,
                }}>
                  {s.sport.slice(0, 3).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>
                    {s.title}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                    {s.duration_min} min
                    {s.intensity ? ` · ${s.intensity}` : ''}
                    {s.tss != null ? ` · TSS ${s.tss}` : ''}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ══════════════════════════════════════════════════════ */}
        {/* SECTION 3 — Plan nutritionnel                         */}
        {/* ══════════════════════════════════════════════════════ */}
        <div style={cardStyle}>
          <p style={sectionTitle}>Plan nutritionnel</p>

          {/* 3A. Ouvrir le plan IA */}
          {!activePlan && (
            <button
              onClick={() => setAiPanelOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 18px',
                borderRadius: 12,
                background: 'linear-gradient(135deg,rgba(0,200,224,0.12),rgba(91,111,255,0.18))',
                border: '1px solid rgba(91,111,255,0.35)',
                color: 'var(--text)',
                fontFamily: 'DM Sans,sans-serif',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                marginBottom: 12,
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.85' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 2a10 10 0 110 20 10 10 0 010-20z" opacity="0.2" fill="currentColor" stroke="none"/>
                <path d="M12 8v4l3 3"/>
                <circle cx="12" cy="12" r="10"/>
              </svg>
              Créer mon plan avec l&apos;IA
            </button>
          )}

          {/* 3C. 14-day calendar grid */}
          {activePlan && (
            <div style={{ marginTop: 0 }}>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 10 }}>
                Plan actif : {activePlan.type} — {formatDate(today)}
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: 6,
              }}>
                {next14Days.map(date => {
                  const planDay = activePlan.plan_data?.jours?.find(j => j.date === date)
                  const dayType: DayType = planDay?.type_jour ?? (
                    date === today ? todayType : 'low'
                  )
                  const colors = DAY_COLORS[dayType]
                  const kcal = planDay?.kcal ?? 0
                  const isToday = date === today
                  const daySessions = sessions.filter(s => {
                    const dow = new Date(date + 'T00:00:00').getDay()
                    const idx = dow === 0 ? 6 : dow - 1
                    return s.day_index === idx
                  })
                  return (
                    <button
                      key={date}
                      onClick={() => planDay ? setDayDetailOpen(planDay) : undefined}
                      style={{
                        padding: '8px 4px',
                        borderRadius: 10,
                        background: isToday ? colors.bg : 'var(--bg-card2)',
                        border: isToday ? `2px solid ${colors.border}` : '1px solid var(--border)',
                        cursor: planDay ? 'pointer' : 'default',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: 9, color: 'var(--text-dim)', fontFamily: 'DM Sans,sans-serif', marginBottom: 2 }}>
                        {formatDate(date)}
                      </div>
                      <div style={{
                        fontSize: 9, fontFamily: 'Syne,sans-serif', fontWeight: 700,
                        color: colors.text, marginBottom: 2,
                      }}>
                        {dayType.toUpperCase()}
                      </div>
                      {kcal > 0 && (
                        <div style={{ fontSize: 9, fontFamily: 'DM Mono,monospace', color: 'var(--text-mid)' }}>
                          {kcal}
                        </div>
                      )}
                      {daySessions.length > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 2, marginTop: 2 }}>
                          {daySessions.map(s => (
                            <div key={s.id} style={{ width: 4, height: 4, borderRadius: '50%', background: '#00c8e0' }} />
                          ))}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════ */}
        {/* SECTION 4 — Repas de la journee                       */}
        {/* ══════════════════════════════════════════════════════ */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <p style={{ ...sectionTitle, marginBottom: 0 }}>Repas de la journee</p>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              style={{
                background: 'var(--input-bg)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '4px 8px', fontSize: 12,
                color: 'var(--text)', fontFamily: 'DM Sans,sans-serif',
              }}
            />
          </div>
          <MealSlotGrid
            date={selectedDate}
            showToast={showToast}
            onSaved={selectedDate === today ? reloadTodaySlots : undefined}
          />
        </div>

        {/* ══════════════════════════════════════════════════════ */}
        {/* SECTION 5 — Historique et graphiques                  */}
        {/* ══════════════════════════════════════════════════════ */}
        <div style={cardStyle}>
          <p style={sectionTitle}>Historique</p>

          {/* Row 1 — Period toggle */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            {([
              { key: '7j' as HistRange,  label: '7 jours' },
              { key: '14j' as HistRange, label: '2 semaines' },
              { key: '28j' as HistRange, label: '4 semaines' },
            ]).map(({ key, label }) => {
              const active = histRange === key
              return (
                <button key={key}
                  onClick={() => { setHistRange(key); setWeekOffset(0) }}
                  style={{
                    padding: '5px 14px', borderRadius: 20, cursor: 'pointer',
                    border: active ? 'none' : '1px solid var(--border)',
                    background: active ? 'linear-gradient(90deg,#06B6D4,#3B82F6)' : 'transparent',
                    color: active ? '#fff' : 'var(--text-dim)',
                    fontWeight: active ? 700 : 400,
                    fontSize: 11, fontFamily: 'Syne,sans-serif',
                  }}
                >{label}</button>
              )
            })}
          </div>

          {/* Row 2 — Week navigation (7j only) */}
          {histRange === '7j' && (() => {
            const ws = getWeekStart(weekOffset)
            const we = addDays(ws, 6)
            const fmt = (d: string) => { const [, m, day] = d.split('-'); return `${day}/${m}` }
            const btnStyle = (disabled: boolean): React.CSSProperties => ({
              width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border)',
              background: 'var(--bg-card2)', color: disabled ? 'var(--text-dim)' : 'var(--text)',
              fontSize: 14, cursor: disabled ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: disabled ? 0.4 : 1, fontFamily: 'monospace', flexShrink: 0,
            })
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <button style={btnStyle(weekOffset <= -6)}
                  onClick={() => { if (weekOffset > -6) setWeekOffset(o => o - 1) }}>
                  {'<'}
                </button>
                <span style={{ flex: 1, textAlign: 'center', fontSize: 12, color: 'var(--text)', fontFamily: 'DM Sans,sans-serif' }}>
                  Semaine du {fmt(ws)} au {fmt(we)}
                </span>
                <button style={btnStyle(weekOffset >= 0)}
                  onClick={() => { if (weekOffset < 0) setWeekOffset(o => o + 1) }}>
                  {'>'}
                </button>
              </div>
            )
          })()}

          {/* Row 3 — Data filters (multi-select) */}
          <div style={{ display: 'flex', gap: 5, marginBottom: 18, flexWrap: 'wrap' }}>
            {([
              { key: 'kcal' as DataFilter,      label: 'Kcal' },
              { key: 'proteines' as DataFilter,  label: 'Proteines' },
              { key: 'glucides' as DataFilter,   label: 'Glucides' },
              { key: 'lipides' as DataFilter,    label: 'Lipides' },
              { key: 'macros' as DataFilter,     label: 'Macros completes' },
              { key: 'micros' as DataFilter,     label: 'Micros' },
            ]).map(({ key, label }) => {
              const active = dataFilters.includes(key)
              return (
                <button key={key}
                  onClick={() => setDataFilters(f =>
                    active ? (f.length > 1 ? f.filter(x => x !== key) : f) : [...f, key]
                  )}
                  style={{
                    padding: '4px 11px', borderRadius: 20, cursor: 'pointer',
                    border: active ? 'none' : '1px solid var(--border)',
                    background: active ? 'linear-gradient(90deg,#06B6D4,#3B82F6)' : 'transparent',
                    color: active ? '#fff' : 'var(--text-dim)',
                    fontWeight: active ? 700 : 400,
                    fontSize: 10, fontFamily: 'Syne,sans-serif',
                  }}
                >{label}</button>
              )
            })}
          </div>

          {/* Weekly summary (7j only) */}
          {histRange === '7j' && (() => {
            const ws = getWeekStart(weekOffset)
            const weekDates = Array.from({ length: 7 }, (_, i) => addDays(ws, i))
            const prevDates = Array.from({ length: 7 }, (_, i) => addDays(getWeekStart(weekOffset - 1), i))

            function sumField(dates: string[], field: keyof DailyLog): number {
              return dates.reduce((s, d) => {
                const log = dailyLogs.find(l => l.date === d)
                return s + ((log?.[field] as number) ?? 0)
              }, 0)
            }

            const curr = {
              kcal: Math.round(sumField(weekDates, 'kcal_consommees')),
              prot: Math.round(sumField(weekDates, 'proteines')),
              gluc: Math.round(sumField(weekDates, 'glucides')),
              lip:  Math.round(sumField(weekDates, 'lipides')),
            }
            const prev = {
              kcal: Math.round(sumField(prevDates, 'kcal_consommees')),
              prot: Math.round(sumField(prevDates, 'proteines')),
              gluc: Math.round(sumField(prevDates, 'glucides')),
              lip:  Math.round(sumField(prevDates, 'lipides')),
            }

            if (curr.kcal === 0 && curr.prot === 0) return null

            function deltaBadge(c: number, p: number) {
              if (p === 0 || c === 0) return <span style={{ fontSize: 9, color: 'var(--text-dim)' }}>—</span>
              const pct = Math.round(((c - p) / p) * 100)
              const pos = pct >= 0
              return (
                <span style={{ fontSize: 9, fontWeight: 700, color: pos ? '#22C55E' : '#EF4444' }}>
                  {pos ? '+' : ''}{pct}%
                </span>
              )
            }

            const stats = [
              { label: 'Total Kcal', val: curr.kcal, prevVal: prev.kcal, unit: '' },
              { label: 'Proteines',  val: curr.prot, prevVal: prev.prot, unit: 'g' },
              { label: 'Glucides',   val: curr.gluc, prevVal: prev.gluc, unit: 'g' },
              { label: 'Lipides',    val: curr.lip,  prevVal: prev.lip,  unit: 'g' },
            ]

            return (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 20 }}
                  className="hist-summary-grid">
                  {stats.map(({ label, val, prevVal, unit }) => (
                    <div key={label} style={{
                      background: 'var(--bg-card2)', borderRadius: 10,
                      border: '1px solid var(--border)', padding: '10px 8px', textAlign: 'center',
                    }}>
                      <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'Syne,sans-serif', color: 'var(--text)', lineHeight: 1.2 }}>
                        {val.toLocaleString('fr-FR')}
                        {unit && <span style={{ fontSize: 11, fontWeight: 400, marginLeft: 2 }}>{unit}</span>}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 3 }}>{label}</div>
                      <div style={{ marginTop: 4 }}>{deltaBadge(val, prevVal)}</div>
                    </div>
                  ))}
                </div>
                <style>{`@media (max-width:480px){.hist-summary-grid{grid-template-columns:repeat(2,1fr)!important}}`}</style>
              </>
            )
          })()}

          {/* Kcal bar chart */}
          {dataFilters.includes('kcal') && (() => {
            const days = histDays
            const startDate = histStartDate
            const entries = Array.from({ length: days }, (_, i) => {
              const date = addDays(startDate, i)
              const log = dailyLogs.find(l => l.date === date)
              const slotKcal = mealLogTotals[date]?.kcal ?? 0
              const planDay = activePlan?.plan_data?.jours?.find(j => j.date === date)
              return {
                date,
                label: formatDate(date),
                consumed: (log?.kcal_consommees ?? 0) + slotKcal,
                planned: planDay?.kcal ?? activePlan?.plan_data?.calories_low ?? 0,
              }
            })
            return (
              <div style={{ marginBottom: 20 }}>
                <KcalBarChart entries={entries} />
              </div>
            )
          })()}

          {/* Macros line chart */}
          {(['proteines', 'glucides', 'lipides', 'macros'] as DataFilter[]).some(k => dataFilters.includes(k)) && (() => {
            const days = histRange === '7j' ? 7 : histRange === '14j' ? 14 : 28
            const startDate = histRange === '7j' ? getWeekStart(weekOffset) : addDays(today, -(days - 1))
            const entries = Array.from({ length: days }, (_, i) => {
              const date = addDays(startDate, i)
              const log = dailyLogs.find(l => l.date === date)
              return { date, label: formatDate(date), p: log?.proteines ?? 0, g: log?.glucides ?? 0, l: log?.lipides ?? 0 }
            })
            const objP = activePlan?.plan_data?.macros_low?.proteines ?? 0
            const objG = activePlan?.plan_data?.macros_low?.glucides ?? 0
            const objL = activePlan?.plan_data?.macros_low?.lipides ?? 0
            return (
              <div style={{ marginBottom: 4 }}>
                <MacrosLineChart entries={entries} objP={objP} objG={objG} objL={objL} />
              </div>
            )
          })()}
        </div>

        {/* Weight section */}
        <WeightSection showToast={showToast} />
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* DAY DETAIL MODAL — portal, centered desktop / bottom mobile */}
      {/* ══════════════════════════════════════════════════════════ */}
      {dayDetailOpen && (() => {
        // Totaux ajustés pour la modal : fallback plan÷slots si actual non renseigné
        const modalMealSet = planVariant === 'A'
          ? dayDetailOpen.repas.option_A
          : dayDetailOpen.repas.option_B
        const modalTotals = slotFallback(
          modalMealLogs,
          dayDetailOpen.kcal,
          dayDetailOpen.proteines,
          dayDetailOpen.glucides,
          dayDetailOpen.lipides,
          modalMealSet,
        )
        return createPortal(
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            background: 'rgba(0,0,0,0.62)',
            display: 'flex',
            alignItems: isDesktop ? 'center' : 'flex-end',
            justifyContent: 'center',
          }}
          onClick={() => { setDayDetailOpen(null); setEditSlot(null) }}
        >
          <div
            style={{
              width: '100%', maxWidth: 640,
              background: 'var(--bg-card)',
              borderRadius: isDesktop ? 16 : '16px 16px 0 0',
              padding: 24, maxHeight: '90vh', overflowY: 'auto',
              animation: isDesktop ? 'cardEnter 0.25s ease both' : 'slideUp 0.25s ease',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* ── Header ─────────────────────────────────────── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: 17, color: 'var(--text)' }}>
                  {formatDate(dayDetailOpen.date)}
                </div>
                <div style={{
                  display: 'inline-block', marginTop: 4,
                  padding: '3px 8px', borderRadius: 6,
                  background: DAY_COLORS[dayDetailOpen.type_jour].bg,
                  border: `1px solid ${DAY_COLORS[dayDetailOpen.type_jour].border}`,
                  color: DAY_COLORS[dayDetailOpen.type_jour].text,
                  fontSize: 10, fontFamily: 'Syne,sans-serif', fontWeight: 700,
                }}>
                  {DAY_COLORS[dayDetailOpen.type_jour].label}
                </div>
              </div>
              <button
                onClick={() => { setDayDetailOpen(null); setEditSlot(null) }}
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: 'var(--bg-card2)', border: '1px solid var(--border)',
                  color: 'var(--text-dim)', fontSize: 16, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                ×
              </button>
            </div>

            {/* ── Macro donuts ───────────────────────────────── */}
            <div style={{
              display: 'flex', gap: 8, justifyContent: 'space-around',
              padding: '12px 8px', background: 'var(--bg-card2)',
              borderRadius: 12, border: '1px solid var(--border)',
              marginBottom: 16,
            }}>
              <MacroDonut label="Calories"  consumed={modalTotals.kcal} objective={dayDetailOpen.kcal}      unit="kcal" color="#00c8e0" size={72} />
              <MacroDonut label="Proteines" consumed={modalTotals.prot} objective={dayDetailOpen.proteines} unit="g"    color="#22c55e" size={72} />
              <MacroDonut label="Glucides"  consumed={modalTotals.gluc} objective={dayDetailOpen.glucides}  unit="g"    color="#eab308" size={72} />
              <MacroDonut label="Lipides"   consumed={modalTotals.lip}  objective={dayDetailOpen.lipides}   unit="g"    color="#f97316" size={72} />
            </div>

            {/* ── Option A / B toggle ────────────────────────── */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              {(['A', 'B'] as PlanVariant[]).map(v => (
                <button
                  key={v}
                  onClick={() => setPlanVariant(v)}
                  style={{
                    padding: '5px 14px', borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: planVariant === v ? 'rgba(0,200,224,0.12)' : 'var(--bg-card2)',
                    color: planVariant === v ? '#00c8e0' : 'var(--text-dim)',
                    fontWeight: planVariant === v ? 700 : 400,
                    fontSize: 12, fontFamily: 'Syne,sans-serif', cursor: 'pointer',
                  }}
                >
                  Option {v}
                </button>
              ))}
            </div>

            {/* ── Meal rows ──────────────────────────────────── */}
            {MEAL_KEYS.map(mealKey => {
              const mealSet: MealSet = planVariant === 'A'
                ? dayDetailOpen.repas.option_A
                : dayDetailOpen.repas.option_B
              const slotVal = mealSet[mealKey]
              const text = slotText(slotVal)
              if (text === '-') return null
              const mealLog = modalMealLogs.find(l => l.meal_slot === mealKey)
              const isValidated = mealLog?.validated ?? false
              const isEditing = editSlot === mealKey
              return (
                <div
                  key={mealKey}
                  style={{
                    borderRadius: 10,
                    background: isValidated ? 'rgba(34,197,94,0.05)' : 'var(--bg-card2)',
                    border: `1px solid ${isValidated ? 'rgba(34,197,94,0.25)' : 'var(--border)'}`,
                    marginBottom: 8,
                    overflow: 'hidden',
                  }}
                >
                  {/* ── Row header ── */}
                  <div style={{ padding: '10px 12px' }}>
                    {/* Top: label + actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <div style={{
                        fontSize: 10, fontFamily: 'Syne,sans-serif', fontWeight: 700,
                        color: 'var(--text-mid)', flex: 1,
                      }}>
                        {MEAL_LABELS[mealKey]}
                      </div>

                      {/* Edit button */}
                      <button
                        onClick={() => {
                          if (isEditing) { setEditSlot(null); return }
                          setEditSlot(mealKey)
                          setEditDesc(mealLog?.actual_description ?? text)
                          setEditKcal(mealLog?.actual_kcal != null ? String(mealLog.actual_kcal) : '')
                          setEditProt(mealLog?.actual_prot != null ? String(mealLog.actual_prot) : '')
                          setEditGluc(mealLog?.actual_gluc != null ? String(mealLog.actual_gluc) : '')
                          setEditLip(mealLog?.actual_lip  != null ? String(mealLog.actual_lip)  : '')
                        }}
                        style={{
                          width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                          border: `1px solid ${isEditing ? 'rgba(91,111,255,0.5)' : 'var(--border)'}`,
                          background: isEditing ? 'rgba(91,111,255,0.12)' : 'transparent',
                          color: isEditing ? '#5b6fff' : 'var(--text-dim)', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>

                      {/* Validate pill button */}
                      <button
                        onClick={() => void modalToggleValidated(mealKey, !isValidated, text)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          padding: '4px 10px', borderRadius: 20, flexShrink: 0,
                          border: `1.5px solid ${isValidated ? '#22c55e' : 'var(--border)'}`,
                          background: isValidated
                            ? 'rgba(34,197,94,0.15)'
                            : 'var(--bg-card)',
                          color: isValidated ? '#22c55e' : 'var(--text-dim)',
                          fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 11,
                          cursor: 'pointer',
                          transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                          transform: isValidated ? 'scale(1.05)' : 'scale(1)',
                        }}
                      >
                        {isValidated ? (
                          <>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            Validé
                          </>
                        ) : (
                          <>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                              <circle cx="12" cy="12" r="10"/>
                              <polyline points="12 8 12 12 14 14"/>
                            </svg>
                            Valider
                          </>
                        )}
                      </button>
                    </div>

                    {/* Meal content + macros */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 12, color: 'var(--text)', lineHeight: 1.5 }}>
                          {mealLog?.actual_description ?? text}
                        </p>
                        {mealLog?.actual_kcal != null && (
                          <div style={{ fontSize: 10, fontFamily: 'DM Mono,monospace', color: 'var(--text-dim)', marginTop: 4 }}>
                            {mealLog.actual_kcal} kcal
                            {mealLog.actual_prot != null ? ` · P:${mealLog.actual_prot}g` : ''}
                            {mealLog.actual_gluc != null ? ` G:${mealLog.actual_gluc}g` : ''}
                            {mealLog.actual_lip  != null ? ` L:${mealLog.actual_lip}g`  : ''}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Edit sub-form */}
                  {isEditing && (
                    <div style={{
                      padding: '12px 12px 14px',
                      borderTop: '1px solid var(--border)',
                      background: 'rgba(91,111,255,0.04)',
                    }}>
                      <textarea
                        rows={2}
                        value={editDesc}
                        onChange={e => setEditDesc(e.target.value)}
                        placeholder="Description réelle..."
                        style={{
                          width: '100%', background: 'var(--input-bg)',
                          border: '1px solid var(--border)', borderRadius: 8,
                          padding: '7px 10px', fontSize: 12, color: 'var(--text)',
                          fontFamily: 'DM Sans,sans-serif', resize: 'vertical',
                          marginBottom: 8, boxSizing: 'border-box',
                        }}
                      />
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginBottom: 10 }}>
                        {[
                          { label: 'Kcal',    val: editKcal, set: setEditKcal },
                          { label: 'Prot (g)',val: editProt, set: setEditProt },
                          { label: 'Gluc (g)',val: editGluc, set: setEditGluc },
                          { label: 'Lip (g)', val: editLip,  set: setEditLip  },
                        ].map(({ label, val, set }) => (
                          <div key={label}>
                            <div style={{ fontSize: 9, color: 'var(--text-dim)', marginBottom: 3 }}>{label}</div>
                            <input
                              type="number"
                              value={val}
                              onChange={e => set(e.target.value)}
                              style={{
                                width: '100%', background: 'var(--input-bg)',
                                border: '1px solid var(--border)', borderRadius: 7,
                                padding: '5px 7px', fontSize: 12, color: 'var(--text)',
                                fontFamily: 'DM Mono,monospace', boxSizing: 'border-box',
                              }}
                            />
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => {
                            void modalUpdateLog(mealKey, {
                              actual_description: editDesc || null,
                              actual_kcal: editKcal ? parseInt(editKcal, 10) : null,
                              actual_prot: editProt ? parseFloat(editProt) : null,
                              actual_gluc: editGluc ? parseFloat(editGluc) : null,
                              actual_lip:  editLip  ? parseFloat(editLip)  : null,
                            })
                            setEditSlot(null)
                          }}
                          style={{
                            flex: 1, padding: '7px 0', borderRadius: 8,
                            background: 'rgba(0,200,224,0.15)', border: '1px solid rgba(0,200,224,0.35)',
                            color: '#00c8e0', fontFamily: 'Syne,sans-serif', fontWeight: 700,
                            fontSize: 12, cursor: 'pointer',
                          }}
                        >
                          Enregistrer
                        </button>
                        <button
                          onClick={() => setEditSlot(null)}
                          style={{
                            padding: '7px 14px', borderRadius: 8,
                            background: 'transparent', border: '1px solid var(--border)',
                            color: 'var(--text-dim)', fontSize: 12, cursor: 'pointer',
                          }}
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>,
        document.body,
        )
      })()}

      {/* Section Repas Types */}
      <MealTypesSection
        templates={templates}
        loading={templatesLoading}
        onAdd={addTemplate}
        onUpdate={updateTemplate}
        onDelete={deleteTemplate}
        onOpenAI={(prompt) => { setAiPrompt(prompt); setAiPanelOpen(true) }}
      />

      {/* Section Habitudes */}
      <HabitudesSection
        habits={habits}
        loading={habitsLoading}
        onAdd={addHabit}
        onUpdate={updateHabit}
        onDelete={deleteHabit}
      />

      {/* AI Panel */}
      <AIPanel
        open={aiPanelOpen}
        onClose={() => { setAiPanelOpen(false); setAiPrompt('') }}
        initialFlow="nutrition"
        prefillMessage={aiPrompt || undefined}
      />
    </div>
    </>
  )
}
