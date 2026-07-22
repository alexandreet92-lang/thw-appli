'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import dynamicImport from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { MacroDonut } from '@/components/ui/MacroDonut'
import { useNutrition, useNutritionTemplates, type MealTemplate } from '@/hooks/useNutrition'
import { usePlanning, type PlannedSession } from '@/hooks/usePlanning'
import { useMealLogs, type MealLog } from '@/hooks/useMealLogs'
import { useDailyMeals } from '@/hooks/useDailyMeals'
import { useHydration } from '@/hooks/useHydration'
import { useProfile } from '@/hooks/useProfile'
import { TodayTab } from '@/app/nutrition/components/today/TodayTab'
import { CompositionTab } from '@/app/nutrition/components/composition/CompositionTab'
import { PlanShoppingList } from '@/app/nutrition/components/plan/PlanShoppingList'
import { SuiviSection } from '@/app/nutrition/components/suivi/SuiviSection'
import { NutritionRail } from '@/app/nutrition/components/NutritionRail'
import { PlanTab } from '@/app/nutrition/components/plan/PlanTab'
import type { NutritionPlanData, PlanDay, MealSet, MealSlotValue, DailyLog, WeightLog } from '@/hooks/useNutrition'
import { slotText, slotMacros } from '@/hooks/useNutrition'
import { useI18n } from '@/lib/i18n'
const AIPanel = dynamicImport(() => import('@/components/ai/AIPanel'), { ssr: false })
const BarcodeScanner = dynamicImport(
  () => import('@/components/nutrition/BarcodeScanner').then(m => ({ default: m.BarcodeScanner })),
  { ssr: false }
)
const FoodSearchSheet = dynamicImport(
  () => import('@/components/nutrition/FoodSearchSheet').then(m => ({ default: m.FoodSearchSheet })),
  { ssr: false }
)
import { PageHelp } from '@/onboarding/system/PageHelp'
import { usePageOnboarding } from '@/onboarding/system/usePageOnboarding'
import { NUTRITION_ONBOARDING } from '@/onboarding/configs/nutrition.config'

// ══════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════
type DayType      = 'low' | 'mid' | 'hard'
type HistRange    = '7j' | '14j' | '30j'
type MealKey      = 'petit_dejeuner' | 'collation_matin' | 'dejeuner' | 'collation_apres_midi' | 'diner' | 'collation_soir'
type PlanVariant  = 'A' | 'B'
type NutritionTab = 'today' | 'plan' | 'tracking' | 'body'

// ══════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════
const DAY_COLORS: Record<DayType, { bg: string; border: string; text: string; label: string }> = {
  low:  { bg: 'rgba(34,197,94,0.10)',  border: '#22c55e', text: '#22c55e',  label: 'Jour Low'  },
  mid:  { bg: 'rgba(234,179,8,0.10)',  border: '#eab308', text: '#eab308',  label: 'Jour Mid'  },
  hard: { bg: 'rgba(239,68,68,0.10)',  border: '#ef4444', text: '#ef4444',  label: 'Jour Hard' },
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

// Statut d'une macro vs son objectif (null si pas d'objectif défini).
function macroStatus(consumed: number, objective: number): { label: string; color: string } | null {
  if (objective <= 0) return null
  const ratio = consumed / objective
  if (ratio < 0.9)  return { label: 'à compléter', color: '#64748b' }
  if (ratio <= 1.05) return { label: 'dans la cible', color: '#22c55e' }
  return { label: 'dépassé', color: '#ef4444' }
}

// Agrégats de suivi sur N jours : moyennes consommées + score d'adhérence vs plan.
function computeTracking(logs: DailyLog[], days: number, plan: NutritionPlanData | null, today: string) {
  const dates: string[] = []
  for (let i = days - 1; i >= 0; i--) dates.push(addDays(today, -i))
  const rows = dates.map(date => {
    const log = logs.find(l => l.date === date)
    const planned = plan?.jours?.find(j => j.date === date)?.kcal ?? plan?.calories_low ?? 0
    return { consumed: log?.kcal_consommees ?? 0, p: log?.proteines ?? 0, g: log?.glucides ?? 0, l: log?.lipides ?? 0, planned }
  })
  const logged = rows.filter(r => r.consumed > 0)
  const avg = (arr: number[]) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0)
  const withPlan = logged.filter(r => r.planned > 0)
  const inTarget = withPlan.filter(r => { const x = r.consumed / r.planned; return x >= 0.9 && x <= 1.1 }).length
  return {
    daysLogged:   logged.length,
    avgKcal:      avg(logged.map(r => r.consumed)),
    avgP:         avg(logged.map(r => r.p)),
    avgG:         avg(logged.map(r => r.g)),
    avgL:         avg(logged.map(r => r.l)),
    withPlanCount: withPlan.length,
    inTargetPct:  withPlan.length ? Math.round((inTarget / withPlan.length) * 100) : null,
  }
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
  const color = pct > 1.05 ? '#ef4444' : pct > 0.9 ? '#22c55e' : '#06B6D4'
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

function KcalHistoryChart({ logs, range, activePlan }: { logs: DailyLog[]; range: HistRange; activePlan: NutritionPlanData | null }) {
  const days = range === '7j' ? 7 : range === '14j' ? 14 : 30
  const today = new Date().toISOString().split('T')[0]
  const dates: string[] = []
  for (let i = days - 1; i >= 0; i--) dates.push(addDays(today, -i))

  const entries = dates.map(date => {
    const log = logs.find(l => l.date === date)
    const planDay = activePlan?.jours?.find(j => j.date === date)
    const consumed = log?.kcal_consommees ?? 0
    const planned = planDay?.kcal ?? activePlan?.calories_low ?? 0
    return { date, consumed, planned, label: formatDate(date) }
  })

  const maxVal = Math.max(...entries.map(e => Math.max(e.consumed, e.planned)), 1000)
  const chartH = 160
  const chartW = 300
  const barW = Math.floor(chartW / days) - 4
  const leftPad = 36

  return (
    <svg viewBox={`0 0 ${chartW + leftPad} ${chartH + 28}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {/* Y axis labels */}
      {[0, 0.5, 1].map(frac => {
        const val = Math.round(maxVal * frac)
        const y = chartH - frac * chartH
        return (
          <g key={frac}>
            <line x1={leftPad} y1={y} x2={chartW + leftPad} y2={y} stroke="var(--border)" strokeWidth={1} />
            <text x={leftPad - 4} y={y + 4} textAnchor="end" fill="var(--text-dim)" fontSize={9} fontFamily="DM Mono,monospace">
              {val}
            </text>
          </g>
        )
      })}
      {entries.map((e, i) => {
        const x = leftPad + i * (chartW / days) + 2
        const plannedH = maxVal > 0 ? (e.planned / maxVal) * chartH : 0
        const consumedH = maxVal > 0 ? (e.consumed / maxVal) * chartH : 0
        return (
          <g key={e.date}>
            {/* Planned (outline) */}
            <rect
              x={x} y={chartH - plannedH} width={barW} height={plannedH}
              fill="var(--border)" rx={2}
              opacity={0.4}
            />
            {/* Consumed (filled) */}
            <rect
              x={x} y={chartH - consumedH} width={barW} height={consumedH}
              fill="#06B6D4" rx={2}
              opacity={0.85}
            />
            <text x={x + barW / 2} y={chartH + 16} textAnchor="middle" fill="var(--text-dim)" fontSize={9} fontFamily="DM Sans,sans-serif">
              {e.label.split(' ')[0]}
            </text>
            <text x={x + barW / 2} y={chartH + 26} textAnchor="middle" fill="var(--text-dim)" fontSize={8} fontFamily="DM Mono,monospace">
              {e.label.split(' ')[1]}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function MacrosChart({ logs, activePlan }: { logs: DailyLog[]; activePlan: NutritionPlanData | null }) {
  const today = new Date().toISOString().split('T')[0]
  const dates: string[] = []
  for (let i = 6; i >= 0; i--) dates.push(addDays(today, -i))

  const objP = activePlan?.macros_low?.proteines ?? 0
  const objG = activePlan?.macros_low?.glucides ?? 0
  const objL = activePlan?.macros_low?.lipides ?? 0

  const pts = dates.map(date => {
    const log = logs.find(l => l.date === date)
    return {
      date,
      p: log?.proteines ?? 0,
      g: log?.glucides ?? 0,
      l: log?.lipides ?? 0,
    }
  })

  const maxVal = Math.max(...pts.flatMap(p => [p.p, p.g, p.l]), objP, objG, objL, 1)
  const chartH = 180
  const chartW = 300
  const leftPad = 36
  const n = dates.length

  function toPoints(vals: number[]): string {
    return vals
      .map((v, i) => {
        const x = leftPad + (i / (n - 1)) * chartW
        const y = chartH - (v / maxVal) * chartH
        return `${x},${y}`
      })
      .join(' ')
  }

  const refY = (val: number) => chartH - (val / maxVal) * chartH

  return (
    <div>
      <svg viewBox={`0 0 ${chartW + leftPad} ${chartH + 24}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        {/* Y axis */}
        {[0, 0.5, 1].map(frac => {
          const val = Math.round(maxVal * frac)
          const y = chartH - frac * chartH
          return (
            <g key={frac}>
              <line x1={leftPad} y1={y} x2={chartW + leftPad} y2={y} stroke="var(--border)" strokeWidth={1} />
              <text x={leftPad - 4} y={y + 4} textAnchor="end" fill="var(--text-dim)" fontSize={9} fontFamily="DM Mono,monospace">
                {val}
              </text>
            </g>
          )
        })}
        {/* Objective reference lines */}
        {objP > 0 && <line x1={leftPad} y1={refY(objP)} x2={chartW + leftPad} y2={refY(objP)} stroke="#22c55e" strokeWidth={1} strokeDasharray="4 3" opacity={0.5} />}
        {objG > 0 && <line x1={leftPad} y1={refY(objG)} x2={chartW + leftPad} y2={refY(objG)} stroke="#eab308" strokeWidth={1} strokeDasharray="4 3" opacity={0.5} />}
        {objL > 0 && <line x1={leftPad} y1={refY(objL)} x2={chartW + leftPad} y2={refY(objL)} stroke="#f97316" strokeWidth={1} strokeDasharray="4 3" opacity={0.5} />}
        {/* Polylines */}
        {pts.some(p => p.p > 0) && (
          <polyline points={toPoints(pts.map(p => p.p))} fill="none" stroke="#22c55e" strokeWidth={2} strokeLinejoin="round" />
        )}
        {pts.some(p => p.g > 0) && (
          <polyline points={toPoints(pts.map(p => p.g))} fill="none" stroke="#eab308" strokeWidth={2} strokeLinejoin="round" />
        )}
        {pts.some(p => p.l > 0) && (
          <polyline points={toPoints(pts.map(p => p.l))} fill="none" stroke="#f97316" strokeWidth={2} strokeLinejoin="round" />
        )}
        {/* X axis dates */}
        {dates.map((date, i) => {
          const x = leftPad + (i / (n - 1)) * chartW
          return (
            <text key={date} x={x} y={chartH + 14} textAnchor="middle" fill="var(--text-dim)" fontSize={8} fontFamily="DM Sans,sans-serif">
              {formatDate(date).split(' ')[1]}
            </text>
          )
        })}
      </svg>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
        {[
          { color: '#22c55e', label: 'Proteines' },
          { color: '#eab308', label: 'Glucides' },
          { color: '#f97316', label: 'Lipides' },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: item.color }} />
            <span style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'DM Sans,sans-serif' }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Empty state réutilisable (cohérent design system) ───────────
// ══════════════════════════════════════════════════════════════════
// SECTION STYLES
// ══════════════════════════════════════════════════════════════════
const cardStyle: React.CSSProperties = {
  background: 'var(--bg-card)',
  borderRadius: 20,
  border: '1px solid var(--border)',
  padding: '28px 24px',
  marginBottom: 20,
}

const sectionTitle: React.CSSProperties = {
  fontFamily: 'Syne,sans-serif',
  fontWeight: 700,
  fontSize: 18,
  color: 'var(--text)',
  marginBottom: 22,
  marginTop: 0,
  letterSpacing: '-0.01em',
}

// ══════════════════════════════════════════════════════════════════
// MEAL TEMPLATES SECTION
// ══════════════════════════════════════════════════════════════════

const TEMPLATE_MEAL_LABELS: Record<MealKey, string> = {
  petit_dejeuner:       'Petit-déjeuner',
  collation_matin:      'Collation matin',
  dejeuner:             'Déjeuner',
  collation_apres_midi: 'Collation après-midi',
  diner:                'Dîner',
  collation_soir:       'Collation soir',
}

interface TemplateFormData {
  nom: string
  type_repas: MealKey
  description: string
  kcal: string
  proteines: string
  glucides: string
  lipides: string
}

const EMPTY_FORM: TemplateFormData = {
  nom: '',
  type_repas: 'petit_dejeuner',
  description: '',
  kcal: '',
  proteines: '',
  glucides: '',
  lipides: '',
}

function TemplateForm({
  form, setForm, saving, onSave, onCancel, isEdit, inputStyle, labelStyle
}: {
  form: TemplateFormData
  setForm: React.Dispatch<React.SetStateAction<TemplateFormData>>
  saving: boolean
  onSave: () => Promise<void>
  onCancel: () => void
  isEdit: boolean
  inputStyle: React.CSSProperties
  labelStyle: React.CSSProperties
}) {
  const { t } = useI18n()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <p style={labelStyle}>{t('nutrition.templateForm.name')}</p>
        <input
          value={form.nom}
          onChange={e => setForm(prev => ({ ...prev, nom: e.target.value }))}
          placeholder={t('nutrition.templateForm.namePlaceholder')}
          style={inputStyle}
        />
      </div>
      <div>
        <p style={labelStyle}>{t('nutrition.templateForm.description')}</p>
        <input
          value={form.description}
          onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
          placeholder={t('nutrition.templateForm.descPlaceholder')}
          style={inputStyle}
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
        {[
          { key: 'kcal' as const, label: t('nutrition.macro.kcal'), placeholder: '350' },
          { key: 'proteines' as const, label: t('nutrition.macro.protG'), placeholder: '20' },
          { key: 'glucides' as const, label: t('nutrition.macro.glucG'), placeholder: '45' },
          { key: 'lipides' as const, label: t('nutrition.macro.lipG'), placeholder: '8' },
        ].map(({ key, label, placeholder }) => (
          <div key={key}>
            <p style={labelStyle}>{label}</p>
            <input
              type="number"
              value={form[key]}
              onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
              placeholder={placeholder}
              style={{ ...inputStyle, textAlign: 'center' }}
            />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button
          onClick={onCancel}
          style={{
            padding: '8px 14px', borderRadius: 8,
            border: '1px solid var(--border)', background: 'transparent',
            color: 'var(--text-dim)', fontSize: 12, cursor: 'pointer',
            fontFamily: 'DM Sans,sans-serif',
          }}
        >
          {t('nutrition.common.cancel')}
        </button>
        <button
          onClick={() => void onSave()}
          disabled={saving || !form.nom.trim()}
          style={{
            flex: 1, padding: '8px', borderRadius: 8, border: 'none',
            background: form.nom.trim() ? 'linear-gradient(135deg,#06B6D4,#5b6fff)' : 'var(--border)',
            color: '#fff', fontSize: 12, fontWeight: 700,
            cursor: form.nom.trim() && !saving ? 'pointer' : 'not-allowed',
            fontFamily: 'DM Sans,sans-serif',
          }}
        >
          {saving ? t('nutrition.common.saving') : isEdit ? t('nutrition.common.edit') : t('nutrition.common.add')}
        </button>
      </div>
    </div>
  )
}

function MealTemplatesSection({
  templates,
  loading,
  onAdd,
  onUpdate,
  onDelete,
  onClose,
}: {
  templates: MealTemplate[]
  loading: boolean
  onAdd: (t: Omit<MealTemplate, 'id' | 'user_id' | 'created_at'>) => Promise<void>
  onUpdate: (id: string, t: Partial<Omit<MealTemplate, 'id' | 'user_id' | 'created_at'>>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm] = useState<TemplateFormData>(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [addingFor, setAddingFor] = useState<MealKey | null>(null)
  const [saving, setSaving] = useState(false)
  const { t: tr } = useI18n()

  function startAdd(mealKey: MealKey) {
    setForm({ ...EMPTY_FORM, type_repas: mealKey })
    setEditingId(null)
    setAddingFor(mealKey)
  }

  function startEdit(t: MealTemplate) {
    setForm({
      nom: t.nom,
      type_repas: t.type_repas,
      description: t.description ?? '',
      kcal: t.kcal?.toString() ?? '',
      proteines: t.proteines?.toString() ?? '',
      glucides: t.glucides?.toString() ?? '',
      lipides: t.lipides?.toString() ?? '',
    })
    setEditingId(t.id)
    setAddingFor(t.type_repas)
  }

  function cancelForm() {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setAddingFor(null)
  }

  async function handleSave() {
    if (!form.nom.trim()) return
    setSaving(true)
    const data = {
      nom: form.nom.trim(),
      type_repas: form.type_repas,
      description: form.description.trim() || null,
      kcal: form.kcal ? parseFloat(form.kcal) : null,
      proteines: form.proteines ? parseFloat(form.proteines) : null,
      glucides: form.glucides ? parseFloat(form.glucides) : null,
      lipides: form.lipides ? parseFloat(form.lipides) : null,
      actif: true,
      source: 'manual' as const,
      meal_timing: null,
      photo_url: null,
      ingredients: null,
      recommended_frequency_per_week: null,
      is_favorite: false,
    }
    if (editingId) {
      await onUpdate(editingId, data)
    } else {
      await onAdd(data)
    }
    setSaving(false)
    cancelForm()
  }

  async function handleDelete(id: string) {
    if (!confirm(tr('nutrition.templates.deleteConfirm'))) return
    await onDelete(id)
  }

  async function handleToggle(t: MealTemplate) {
    await onUpdate(t.id, { actif: !t.actif })
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'var(--bg-card2)',
    color: 'var(--text)',
    fontSize: 13,
    fontFamily: 'DM Sans,sans-serif',
    outline: 'none',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    color: 'var(--text-dim)',
    marginBottom: 4,
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        padding: 0,
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 640, maxHeight: '90vh',
          background: 'var(--bg-card)',
          borderRadius: '16px 16px 0 0',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 -20px 60px rgba(0,0,0,0.25)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0,
        }}>
          <h2 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: 16, margin: 0, color: 'var(--text)' }}>
            {tr('nutrition.templates.title')}
          </h2>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: '50%',
              border: '1px solid var(--border)', background: 'transparent',
              color: 'var(--text-dim)', cursor: 'pointer', fontSize: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '16px 20px 24px' }}>
          {loading ? (
            <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>{tr('nutrition.common.loading')}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {(Object.keys(TEMPLATE_MEAL_LABELS) as MealKey[]).map(mealKey => {
                const groupTemplates = templates.filter(t => t.type_repas === mealKey)
                const isAddingHere = addingFor === mealKey && !editingId

                return (
                  <div key={mealKey}>
                    {/* Group header */}
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      marginBottom: 8,
                    }}>
                      <span style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>
                        {tr(`nutrition.meal.${mealKey}`)}
                      </span>
                      {addingFor !== mealKey && (
                        <button
                          onClick={() => startAdd(mealKey)}
                          style={{
                            padding: '4px 10px', borderRadius: 7,
                            border: '1px solid var(--border)',
                            background: 'transparent',
                            color: 'var(--text-dim)', fontSize: 11,
                            cursor: 'pointer', fontFamily: 'DM Sans,sans-serif',
                          }}
                        >
                          {tr('nutrition.templates.addBtn')}
                        </button>
                      )}
                    </div>

                    {/* Templates in this group */}
                    {groupTemplates.length === 0 && !isAddingHere && (
                      <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: '0 0 4px', fontStyle: 'italic' }}>
                        {tr('nutrition.templates.empty')}
                      </p>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {groupTemplates.map(t => {
                      const isEditingThis = editingId === t.id

                      if (isEditingThis) {
                        return (
                          <div key={t.id} style={{
                            background: 'var(--bg-card2)', border: '1px solid rgba(91,111,255,0.3)',
                            borderRadius: 10, padding: 14, marginBottom: 8,
                          }}>
                            <TemplateForm
                              form={form}
                              setForm={setForm}
                              saving={saving}
                              onSave={handleSave}
                              onCancel={cancelForm}
                              isEdit
                              inputStyle={inputStyle}
                              labelStyle={labelStyle}
                            />
                          </div>
                        )
                      }

                      return (
                        <div key={t.id} style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '10px 12px', borderRadius: 10,
                          background: 'var(--bg-card2)', border: '1px solid var(--border)',
                          marginBottom: 6,
                          opacity: t.actif ? 1 : 0.5,
                        }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: 'DM Sans,sans-serif', fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>
                              {t.nom}
                            </div>
                            {t.description && (
                              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{t.description}</div>
                            )}
                            <div style={{ fontSize: 10, fontFamily: 'DM Mono,monospace', color: 'var(--text-dim)', marginTop: 3 }}>
                              {t.kcal != null ? `${t.kcal} kcal` : '—'}
                              {t.proteines != null ? ` · P:${t.proteines}g` : ''}
                              {t.glucides != null ? ` G:${t.glucides}g` : ''}
                              {t.lipides != null ? ` L:${t.lipides}g` : ''}
                            </div>
                          </div>
                          {/* Toggle actif */}
                          <button
                            onClick={() => void handleToggle(t)}
                            title={t.actif ? tr('nutrition.templates.deactivate') : tr('nutrition.templates.activate')}
                            style={{
                              width: 32, height: 18, borderRadius: 9,
                              border: 'none',
                              background: t.actif ? '#22c55e' : 'var(--border)',
                              cursor: 'pointer', flexShrink: 0, position: 'relative',
                              transition: 'background 0.15s',
                            }}
                          >
                            <div style={{
                              position: 'absolute', top: 2,
                              left: t.actif ? 16 : 2,
                              width: 14, height: 14, borderRadius: '50%',
                              background: '#fff',
                              transition: 'left 0.15s',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                            }} />
                          </button>
                          {/* Edit */}
                          <button
                            onClick={() => startEdit(t)}
                            style={{
                              width: 28, height: 28, borderRadius: 7,
                              border: '1px solid var(--border)', background: 'transparent',
                              color: 'var(--text-dim)', cursor: 'pointer', fontSize: 13,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                          {/* Delete */}
                          <button
                            onClick={() => void handleDelete(t.id)}
                            style={{
                              width: 28, height: 28, borderRadius: 7,
                              border: '1px solid rgba(239,68,68,0.3)', background: 'transparent',
                              color: '#ef4444', cursor: 'pointer', fontSize: 13,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                              <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
                            </svg>
                          </button>
                        </div>
                      )
                    })}
                    </div>{/* end templates grid */}

                    {/* Add form for this group */}
                    {isAddingHere && (
                      <div style={{
                        background: 'var(--bg-card2)', border: '1px solid rgba(91,111,255,0.3)',
                        borderRadius: 10, padding: 14, marginBottom: 8,
                      }}>
                        <TemplateForm
                          form={form}
                          setForm={setForm}
                          saving={saving}
                          onSave={handleSave}
                          onCancel={cancelForm}
                          isEdit={false}
                          inputStyle={inputStyle}
                          labelStyle={labelStyle}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// TAB NAVIGATION — style identique aux pills de la page Training
// ══════════════════════════════════════════════════════════════════
const NUTRITION_TAB_ITEMS: { id: NutritionTab; label: string }[] = [
  { id: 'today',    label: "Aujourd'hui" },
  { id: 'plan',     label: 'Mon plan' },
  { id: 'tracking', label: 'Suivi' },
  { id: 'body',     label: 'Composition' },
]
const TAB_ORDER: NutritionTab[] = NUTRITION_TAB_ITEMS.map(t => t.id)

// Onglets « pilule » — segmented control identique à SectionLayout (page Récupération).
function NutritionTabs({ tab, onChange }: { tab: NutritionTab; onChange: (t: NutritionTab) => void }) {
  const { t: tr } = useI18n()
  return (
    <div
      className="nt-tabscroll"
      style={{ marginBottom: 22, overflowX: 'auto', WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'] }}
    >
      <style>{`.nt-tabscroll{scrollbar-width:none}.nt-tabscroll::-webkit-scrollbar{display:none}`}</style>
      <div role="tablist" style={{ display: 'inline-flex', gap: 2, padding: 3, borderRadius: 999, background: 'var(--bg-card2)' }}>
        {NUTRITION_TAB_ITEMS.map(t => {
          const active = tab === t.id
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              onClick={() => onChange(t.id)}
              style={{
                border: 'none', cursor: 'pointer', borderRadius: 999, padding: '7px 16px',
                fontFamily: 'DM Sans,sans-serif', whiteSpace: 'nowrap',
                fontSize: 12, fontWeight: active ? 700 : 600,
                background: active ? 'var(--bg-elev)' : 'transparent',
                color: active ? 'var(--text)' : 'var(--text-mid)',
                boxShadow: active ? 'var(--shadow-card)' : 'none',
                transition: 'background 0.18s, color 0.18s',
              }}
            >
              {tr(`nutrition.tab.${t.id}`)}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════
export default function NutritionPage() {
  // Date du jour en heure LOCALE (toISOString = UTC → décale d'un jour le soir).
  const _now = new Date()
  const realToday = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}-${String(_now.getDate()).padStart(2, '0')}`
  // « today » = jour SÉLECTIONNÉ dans la frise (par défaut aujourd'hui) ; tout le wiring
  // du jour (repas, hydratation, séances, target) suit ce jour automatiquement.
  const [today, setSelDay] = useState(realToday)
  const [dayDir, setDayDir] = useState<'right' | 'left'>('right')
  const selectDay = useCallback((d: string) => { setDayDir(d >= today ? 'right' : 'left'); setSelDay(d) }, [today])
  const { show, dismiss } = usePageOnboarding(NUTRITION_ONBOARDING.pageId, NUTRITION_ONBOARDING.version)
  const { t } = useI18n()

  const { activePlan, dailyLogs, weightLogs, loading: nutLoading, saveDailyLog, saveWeightLog, deactivatePlan } = useNutrition()
  const { profile } = useProfile()
  const { templates, loading: templatesLoading, addTemplate, updateTemplate, deleteTemplate } = useNutritionTemplates()
  const { sessions } = usePlanning()

  // ── State ──────────────────────────────────────────────────────
  const [tab, setTab] = useState<NutritionTab>('today')
  const [tabDir, setTabDir] = useState<'right' | 'left'>('right')
  const changeTab = useCallback((next: NutritionTab) => {
    setTabDir(TAB_ORDER.indexOf(next) >= TAB_ORDER.indexOf(tab) ? 'right' : 'left')
    setTab(next)
  }, [tab])
  const [planVariant, setPlanVariant] = useState<PlanVariant>('A')
  const [histRange, setHistRange] = useState<HistRange>('7j')
  const [dayDetailOpen, setDayDetailOpen] = useState<PlanDay | null>(null)
  const [shoppingOpen, setShoppingOpen] = useState(false)
  const [regenConfirm, setRegenConfirm] = useState(false)
  const [aiPanelOpen, setAiPanelOpen] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null)
  const [foodSearchOpen, setFoodSearchOpen] = useState(false)
  const [foodSearchBarcode, setFoodSearchBarcode] = useState<string | undefined>(undefined)
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

  // ── Meal logs for today (Bilan du jour) ───────────────────────
  const { logs: todayMealLogs, reload: reloadTodayLogs } = useMealLogs(activePlan?.id, today)

  // ── Journal alimentaire du jour (indépendant du plan) ─────────
  const dayMeals  = useDailyMeals(today)
  const hydration = useHydration(today)
  const [mealJumpSignal, setMealJumpSignal] = useState(0)
  const jumpToMeals = useCallback(() => {
    setMealJumpSignal(s => s + 1)
    requestAnimationFrame(() => {
      document.getElementById('repas-du-jour')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [])
  const [suggestion, setSuggestion] = useState<{ title: string; description: string; kcal: number; prot: number; gluc: number; lip: number } | null>(null)
  const [suggesting, setSuggesting] = useState(false)

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


  // ── Supprimer (désactiver) le plan actif ────────────────────────
  const handleDeletePlan = useCallback(async () => {
    if (!confirm(t('nutrition.plan.deleteConfirm'))) return
    await deactivatePlan()
  }, [deactivatePlan])

  // ── Suggestion IA du prochain repas ─────────────────────────────
  const handleSuggestMeal = useCallback(async () => {
    setSuggesting(true)
    setSuggestion(null)
    try {
      const remaining = {
        kcal: Math.max(0, todayKcalObj - dayMeals.totals.kcal),
        prot: Math.max(0, todayMacroObj.proteines - dayMeals.totals.prot),
        gluc: Math.max(0, todayMacroObj.glucides - dayMeals.totals.gluc),
        lip:  Math.max(0, todayMacroObj.lipides  - dayMeals.totals.lip),
      }
      const res = await fetch('/api/suggest-next-meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remaining, dayType: todayType }),
      })
      if (res.ok) {
        const r = await res.json() as { title: string; description: string; kcal: number; prot: number; gluc: number; lip: number }
        setSuggestion(r)
      }
    } catch (err) {
      console.error('[handleSuggestMeal]', err)
    } finally {
      setSuggesting(false)
    }
  }, [todayKcalObj, todayMacroObj, todayType, dayMeals.totals])

  // ── Loading ────────────────────────────────────────────────────
  if (nutLoading) {
    return <div style={{ padding: 24, color: 'var(--text-dim)' }}>{t('nutrition.common.loading')}</div>
  }

  // ── 14-day dates ───────────────────────────────────────────────
  const next14Days = Array.from({ length: 14 }, (_, i) => addDays(today, i))

  return (
    <div style={{ width: '100%', maxWidth: '100%', margin: 0, padding: '0 0 80px', overflowX: 'hidden', boxSizing: 'border-box' }}>
      <PageHelp config={NUTRITION_ONBOARDING} show={show} onDismiss={dismiss} />
      {/* ── Scanner code-barres (mobile uniquement via CSS) ────── */}
      {scannerOpen && (
        <BarcodeScanner
          onDetected={code => {
            setScannedBarcode(code)
            setScannerOpen(false)
            setFoodSearchBarcode(code)
            setFoodSearchOpen(true)
          }}
          onClose={() => setScannerOpen(false)}
        />
      )}

      {foodSearchOpen && (
        <FoodSearchSheet
          initialBarcode={foodSearchBarcode}
          onClose={() => { setFoodSearchOpen(false); setFoodSearchBarcode(undefined) }}
          onSelect={(food, grams) => {
            const ratio = grams / 100
            const n = food.nutriments
            setEditDesc(food.product_name + (grams !== 100 ? ` (${grams}g)` : ''))
            setEditKcal(String(Math.round(n['energy-kcal_100g'] * ratio)))
            setEditProt(String(+((n.proteins_100g * ratio).toFixed(1))))
            setEditGluc(String(+((n.carbohydrates_100g * ratio).toFixed(1))))
            setEditLip(String(+((n.fat_100g * ratio).toFixed(1))))
            setFoodSearchOpen(false)
            setFoodSearchBarcode(undefined)
          }}
        />
      )}

      {/* ── HEADER (mobile) — sur desktop le titre est dans le rail ─── */}
      <div style={{ display: isDesktop ? 'none' : 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 24, paddingLeft: 'max(22px, env(safe-area-inset-left))', paddingRight: 'max(22px, env(safe-area-inset-right))', width: '100%', maxWidth: 1100, margin: '0 auto', boxSizing: 'border-box' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 24, margin: 0 }}>{t('nutrition.title')}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Bouton scanner — visible mobile uniquement (md:hidden via Tailwind) */}
          <button
            onClick={() => setScannerOpen(true)}
            className="flex md:hidden items-center justify-center w-9 h-9 rounded-full"
            style={{ background: 'var(--bg-card2)', border: '1px solid var(--border)', color: 'var(--text-dim)' }}
            aria-label={t('nutrition.scanBarcode')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M3 5h2M7 5h1M3 7v2M21 5h-2M17 5h-1M21 7v2M3 17v2M3 19h2M7 19h1M21 17v2M21 19h-2M17 19h-1"/>
              <path d="M7 3v18M11 3v18M15 3v18M3 11h18"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Code scanné — feedback visible */}
      {scannedBarcode && (
        <div style={{ margin: '12px 20px 0', padding: '10px 14px', borderRadius: 10, background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div>
            <p style={{ fontSize: 11, color: '#06B6D4', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('nutrition.scannedCode')}</p>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: '2px 0 0', fontFamily: 'DM Mono,monospace' }}>{scannedBarcode}</p>
          </div>
          <button
            onClick={() => setScannedBarcode(null)}
            style={{ width: 24, height: 24, borderRadius: '50%', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
      )}

      {/* Desktop : rail latéral gauche (comme Planning) + contenu pleine largeur.
          Mobile : onglets en haut (inchangés). */}
      <div style={{ display: isDesktop ? 'flex' : 'block', alignItems: 'flex-start', width: '100%', maxWidth: '100%', overflowX: 'clip', boxSizing: 'border-box' }}>
        {isDesktop && <NutritionRail tab={tab} onChange={changeTab} />}
        <div className="pt-[14px] md:pt-7" style={{ paddingBottom: 0, paddingLeft: isDesktop ? 32 : 'max(22px, env(safe-area-inset-left))', paddingRight: isDesktop ? 32 : 'max(22px, env(safe-area-inset-right))', flex: 1, minWidth: 0, width: '100%', maxWidth: 1100, margin: '0 auto', boxSizing: 'border-box' }}>

        {!isDesktop && <NutritionTabs tab={tab} onChange={changeTab} />}

        <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab}
          initial={{ opacity: 0, x: tabDir === 'right' ? 50 : -50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: tabDir === 'right' ? -50 : 50 }}
          transition={{ duration: 0.26, ease: [0.32, 0.72, 0, 1] }}
        >

        {tab === 'today' && (
          <TodayTab
            today={today}
            realToday={realToday}
            dayDir={dayDir}
            onSelectDay={selectDay}
            todayType={todayType}
            todayKcalObj={todayKcalObj}
            baseKcal={activePlan?.plan_data?.calories_low ?? null}
            todayMacroObj={todayMacroObj}
            aiPlan={activePlan ? { kcal: todayKcalObj, macros: todayMacroObj, dayType: todayType } : null}
            dayMeals={dayMeals}
            hydration={hydration}
            todaySessions={todaySessions}
            weightKg={profile?.weight_kg ?? null}
            mealJumpSignal={mealJumpSignal}
            suggestion={suggestion}
            suggesting={suggesting}
            onSuggest={() => void handleSuggestMeal()}
            isDesktop={isDesktop}
          />
        )}

        {/* ══════════════════════════════════════════════════════ */}
        {/* SECTION 3 — Plan nutritionnel                         */}
        {/* ══════════════════════════════════════════════════════ */}
        {tab === 'plan' && (
          <PlanTab
            activePlan={activePlan}
            today={today}
            todayType={todayType}
            todayKcalObj={todayKcalObj}
            todayMacroObj={todayMacroObj}
            todaySessions={todaySessions}
            next14Days={next14Days}
            onOpenDay={setDayDetailOpen}
            onOpenAI={() => setAiPanelOpen(true)}
            onOpenShopping={() => setShoppingOpen(true)}
            onRegen={() => setRegenConfirm(true)}
            onDelete={() => void handleDeletePlan()}
            isDesktop={isDesktop}
          />
        )}

        {/* ══════════════════════════════════════════════════════ */}
        {/* SECTION 5 — Historique et graphiques                  */}
        {/* ══════════════════════════════════════════════════════ */}
        {tab === 'tracking' && (
          <SuiviSection
            dailyLogs={dailyLogs}
            plan={activePlan?.plan_data ?? null}
            weightKg={profile?.weight_kg ?? null}
            today={today}
          />
        )}

        {/* Weight section */}
        {tab === 'body' && (
          <CompositionTab
            weightLogs={weightLogs}
            heightCm={profile?.height_cm ?? null}
            saveWeightLog={saveWeightLog}
            onGoToPlan={() => setTab('plan')}
            isDesktop={isDesktop}
          />
        )}

        </motion.div>
        </AnimatePresence>{/* end animated tab content */}
        </div>{/* end content column */}
      </div>{/* end desktop rail + content flex */}

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
        // Interconnexion : séance(s) du jour qui justifient le type de jour.
        const dow = new Date(dayDetailOpen.date + 'T00:00:00').getDay()
        const dayIdx = dow === 0 ? 6 : dow - 1
        const daySess = sessions.filter(s => s.day_index === dayIdx)
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
                  {t(`nutrition.dayType.${dayDetailOpen.type_jour}`)}
                </div>
                {/* Interconnexion → séance qui justifie le type de jour */}
                {daySess.length > 0 ? (
                  <a href="/planning" style={{ display: 'block', marginTop: 8, fontSize: 12, color: '#06B6D4', fontFamily: 'DM Sans,sans-serif', fontWeight: 600, textDecoration: 'none' }}>
                    {daySess.map(s => s.title).filter(Boolean).join(' · ') || t('nutrition.plannedSession')} →
                  </a>
                ) : (
                  <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-dim)', fontFamily: 'DM Sans,sans-serif' }}>{t('nutrition.noSessionLinked')}</div>
                )}
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
              <MacroDonut label={t('nutrition.macro.calories')}  consumed={modalTotals.kcal} objective={dayDetailOpen.kcal}      unit="kcal" color="#06B6D4" size={72} />
              <MacroDonut label={t('nutrition.macro.proteins')} consumed={modalTotals.prot} objective={dayDetailOpen.proteines} unit="g"    color="#22c55e" size={72} />
              <MacroDonut label={t('nutrition.macro.carbs')}  consumed={modalTotals.gluc} objective={dayDetailOpen.glucides}  unit="g"    color="#eab308" size={72} />
              <MacroDonut label={t('nutrition.macro.fats')}   consumed={modalTotals.lip}  objective={dayDetailOpen.lipides}   unit="g"    color="#f97316" size={72} />
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
                    background: planVariant === v ? 'rgba(6,182,212,0.12)' : 'var(--bg-card2)',
                    color: planVariant === v ? '#06B6D4' : 'var(--text-dim)',
                    fontWeight: planVariant === v ? 700 : 400,
                    fontSize: 12, fontFamily: 'Syne,sans-serif', cursor: 'pointer',
                  }}
                >
                  {t('nutrition.optionLabel', { v })}
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
                        {t(`nutrition.meal.${mealKey}`)}
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
                            {t('nutrition.validated')}
                          </>
                        ) : (
                          <>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                              <circle cx="12" cy="12" r="10"/>
                              <polyline points="12 8 12 12 14 14"/>
                            </svg>
                            {t('nutrition.validate')}
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
                      <button
                        onClick={() => { setFoodSearchBarcode(undefined); setFoodSearchOpen(true) }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 7, width: '100%',
                          padding: '7px 10px', borderRadius: 8, marginBottom: 8,
                          border: '1px solid var(--border)', background: 'var(--bg-card)',
                          cursor: 'pointer', color: 'var(--text-dim)', fontSize: 12,
                          fontFamily: 'DM Sans,sans-serif',
                        }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                        {t('nutrition.searchFood')}
                      </button>
                      <textarea
                        rows={2}
                        value={editDesc}
                        onChange={e => setEditDesc(e.target.value)}
                        placeholder={t('nutrition.actualDescPlaceholder')}
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
                          { label: t('nutrition.macro.kcal'),    val: editKcal, set: setEditKcal },
                          { label: t('nutrition.macro.protG'),val: editProt, set: setEditProt },
                          { label: t('nutrition.macro.glucG'),val: editGluc, set: setEditGluc },
                          { label: t('nutrition.macro.lipG'), val: editLip,  set: setEditLip  },
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
                            background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.35)',
                            color: '#06B6D4', fontFamily: 'Syne,sans-serif', fontWeight: 700,
                            fontSize: 12, cursor: 'pointer',
                          }}
                        >
                          {t('nutrition.common.save')}
                        </button>
                        <button
                          onClick={() => setEditSlot(null)}
                          style={{
                            padding: '7px 14px', borderRadius: 8,
                            background: 'transparent', border: '1px solid var(--border)',
                            color: 'var(--text-dim)', fontSize: 12, cursor: 'pointer',
                          }}
                        >
                          {t('nutrition.common.cancel')}
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

      {/* Liste de courses (dérivée des repas réels du plan) */}
      {shoppingOpen && activePlan && (
        <PlanShoppingList
          plan={activePlan.plan_data}
          variant={planVariant}
          selectedDate={dayDetailOpen?.date ?? null}
          isDesktop={isDesktop}
          onClose={() => setShoppingOpen(false)}
        />
      )}

      {/* Confirmation de régénération (consommation tokens : cf. .md, système
          de crédits non localisé → garde-fou à brancher quand dispo). */}
      {regenConfirm && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 2100, background: 'rgba(0,0,0,0.62)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setRegenConfirm(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 380, background: 'var(--bg-card)', borderRadius: 16, padding: 22 }}>
            <h3 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: 16, color: 'var(--text)', margin: '0 0 8px' }}>{t('nutrition.regen.title')}</h3>
            <p style={{ fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.5, margin: '0 0 18px' }}>
              {t('nutrition.regen.desc')}
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setRegenConfirm(false)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text)', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>{t('nutrition.common.cancel')}</button>
              <button onClick={() => { setRegenConfirm(false); setAiPanelOpen(true) }} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#06B6D4,#5b6fff)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>{t('nutrition.regen.confirm')}</button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* Bouton Mes repas types */}
      {tab === 'plan' && (
      <div style={{ padding: '8px 16px 24px', textAlign: 'center' }}>
        <Button variant="ghost" onClick={() => setShowTemplates(true)}>
          {t('nutrition.templates.title')}
        </Button>
      </div>
      )}

      {/* Templates modal */}
      {showTemplates && (
        <MealTemplatesSection
          templates={templates}
          loading={templatesLoading}
          onAdd={addTemplate}
          onUpdate={updateTemplate}
          onDelete={deleteTemplate}
          onClose={() => setShowTemplates(false)}
        />
      )}

      {/* AI Panel — déclenche le flow nutrition */}
      <AIPanel
        open={aiPanelOpen}
        onClose={() => setAiPanelOpen(false)}
        initialFlow="nutrition"
      />
    </div>
  )
}
