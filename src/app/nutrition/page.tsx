'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import dynamicImport from 'next/dynamic'
import AIAssistantButton from '@/components/ai/AIAssistantButton'
import { useNutrition, useNutritionTemplates, type MealTemplate } from '@/hooks/useNutrition'
import { usePlanning, type PlannedSession } from '@/hooks/usePlanning'
import type { NutritionPlanData, PlanDay, MealSet, DailyLog, WeightLog } from '@/hooks/useNutrition'
const AIPanel = dynamicImport(() => import('@/components/ai/AIPanel'), { ssr: false })

// ══════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════
type DayType      = 'low' | 'mid' | 'hard'
type WeightMetric = 'poids' | 'mg' | 'mm'
type HistRange    = '7j' | '14j'
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

function KcalHistoryChart({ logs, range, activePlan }: { logs: DailyLog[]; range: HistRange; activePlan: NutritionPlanData | null }) {
  const days = range === '7j' ? 7 : 14
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
              fill="#00c8e0" rx={2}
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

function WeightChart({ logs, metric }: { logs: WeightLog[]; metric: WeightMetric }) {
  if (!logs.length) {
    return <div style={{ color: 'var(--text-dim)', fontSize: 13, padding: '24px 0' }}>Aucune donnee disponible</div>
  }

  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date))
  const vals = sorted.map(l => (metric === 'poids' ? l.poids : metric === 'mg' ? l.mg : l.mm) ?? null)
  const nonNull = vals.filter((v): v is number => v !== null)
  if (!nonNull.length) return <div style={{ color: 'var(--text-dim)', fontSize: 13, padding: '24px 0' }}>Aucune donnee pour cette metrique</div>

  const minV = Math.min(...nonNull)
  const maxV = Math.max(...nonNull)
  const range = maxV - minV || 1
  const chartH = 160
  const chartW = 300
  const leftPad = 40
  const n = sorted.length

  function toX(i: number) {
    return n === 1 ? leftPad + chartW / 2 : leftPad + (i / (n - 1)) * chartW
  }
  function toY(v: number) {
    return chartH - ((v - minV) / range) * chartH * 0.8 - chartH * 0.1
  }

  const points = sorted
    .map((_, i) => (vals[i] !== null ? `${toX(i)},${toY(vals[i] as number)}` : null))
    .filter(Boolean)
    .join(' ')

  const yLabels = [minV, (minV + maxV) / 2, maxV]

  return (
    <svg viewBox={`0 0 ${chartW + leftPad} ${chartH + 28}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {yLabels.map((v, i) => {
        const y = toY(v)
        return (
          <g key={i}>
            <line x1={leftPad} y1={y} x2={chartW + leftPad} y2={y} stroke="var(--border)" strokeWidth={1} />
            <text x={leftPad - 4} y={y + 4} textAnchor="end" fill="var(--text-dim)" fontSize={9} fontFamily="DM Mono,monospace">
              {v.toFixed(1)}
            </text>
          </g>
        )
      })}
      {points && <polyline points={points} fill="none" stroke="#00c8e0" strokeWidth={2} strokeLinejoin="round" />}
      {sorted.map((_, i) => {
        const v = vals[i]
        if (v === null) return null
        return (
          <circle key={i} cx={toX(i)} cy={toY(v)} r={4} fill="#00c8e0" stroke="var(--bg-card)" strokeWidth={2} />
        )
      })}
      {sorted.map((entry, i) => {
        if (i % Math.ceil(n / 5) !== 0 && i !== n - 1) return null
        return (
          <text key={entry.date} x={toX(i)} y={chartH + 16} textAnchor="middle" fill="var(--text-dim)" fontSize={8} fontFamily="DM Sans,sans-serif">
            {entry.date.slice(5)}
          </text>
        )
      })}
    </svg>
  )
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
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <p style={labelStyle}>Nom du repas</p>
        <input
          value={form.nom}
          onChange={e => setForm(prev => ({ ...prev, nom: e.target.value }))}
          placeholder="ex: Porridge avoine banane"
          style={inputStyle}
        />
      </div>
      <div>
        <p style={labelStyle}>Description (optionnel)</p>
        <input
          value={form.description}
          onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Ingrédients, quantités..."
          style={inputStyle}
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
        {[
          { key: 'kcal' as const, label: 'Kcal', placeholder: '350' },
          { key: 'proteines' as const, label: 'Prot (g)', placeholder: '20' },
          { key: 'glucides' as const, label: 'Gluc (g)', placeholder: '45' },
          { key: 'lipides' as const, label: 'Lip (g)', placeholder: '8' },
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
          Annuler
        </button>
        <button
          onClick={() => void onSave()}
          disabled={saving || !form.nom.trim()}
          style={{
            flex: 1, padding: '8px', borderRadius: 8, border: 'none',
            background: form.nom.trim() ? 'linear-gradient(135deg,#00c8e0,#5b6fff)' : 'var(--border)',
            color: '#fff', fontSize: 12, fontWeight: 700,
            cursor: form.nom.trim() && !saving ? 'pointer' : 'not-allowed',
            fontFamily: 'DM Sans,sans-serif',
          }}
        >
          {saving ? 'Sauvegarde...' : isEdit ? 'Modifier' : 'Ajouter'}
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
    if (!confirm('Supprimer ce repas type ?')) return
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
            Mes repas types
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
            <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>Chargement...</p>
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
                        {TEMPLATE_MEAL_LABELS[mealKey]}
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
                          + Ajouter
                        </button>
                      )}
                    </div>

                    {/* Templates in this group */}
                    {groupTemplates.length === 0 && !isAddingHere && (
                      <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: '0 0 4px', fontStyle: 'italic' }}>
                        Aucun repas type
                      </p>
                    )}

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
                            title={t.actif ? 'Désactiver' : 'Activer'}
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
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════
export default function NutritionPage() {
  const today = new Date().toISOString().split('T')[0]

  const { activePlan, dailyLogs, weightLogs, loading: nutLoading, saveDailyLog, saveWeightLog } = useNutrition()
  const { templates, loading: templatesLoading, addTemplate, updateTemplate, deleteTemplate } = useNutritionTemplates()
  const { sessions } = usePlanning()

  // ── State ──────────────────────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState<string>(today)
  const [planVariant, setPlanVariant] = useState<PlanVariant>('A')
  const [histRange, setHistRange] = useState<HistRange>('7j')
  const [weightMetric, setWeightMetric] = useState<WeightMetric>('poids')
  const [dayDetailOpen, setDayDetailOpen] = useState<PlanDay | null>(null)
  const [savingLog, setSavingLog] = useState<boolean>(false)
  const [weightInputDate, setWeightInputDate] = useState<string>(today)
  const [weightInput, setWeightInput] = useState<string>('')
  const [mgInput, setMgInput] = useState<string>('')
  const [mmInput, setMmInput] = useState<string>('')
  const [manualMeals, setManualMeals] = useState<Partial<Record<MealKey, string>>>({})
  const [manualKcal, setManualKcal] = useState<string>('')
  const [manualP, setManualP] = useState<string>('')
  const [manualG, setManualG] = useState<string>('')
  const [manualL, setManualL] = useState<string>('')
  const [aiPanelOpen, setAiPanelOpen] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)

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

  // ── Save weight log ────────────────────────────────────────────
  const handleSaveWeight = useCallback(async () => {
    if (!weightInput && !mgInput && !mmInput) return
    const log: Omit<WeightLog, 'id'> = {
      date: weightInputDate,
      poids: weightInput ? parseFloat(weightInput) : null,
      mg: mgInput ? parseFloat(mgInput) : null,
      mm: mmInput ? parseFloat(mmInput) : null,
      source: 'manuel',
    }
    await saveWeightLog(log)
    setWeightInput('')
    setMgInput('')
    setMmInput('')
  }, [weightInputDate, weightInput, mgInput, mmInput, saveWeightLog])

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
    <div style={{ padding: '0 0 80px' }}>
      {/* ── HEADER ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 0' }}>
        <h1 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 24, margin: 0 }}>Nutrition</h1>
        <AIAssistantButton agent="nutrition" context={{ activePlan, todayLog }} />
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

          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <KcalGauge
              consumed={todayLog?.kcal_consommees ?? 0}
              objective={todayKcalObj}
            />
            <div style={{ flex: 1, minWidth: 180 }}>
              <MacroBar
                label="Proteines"
                consumed={todayLog?.proteines ?? 0}
                objective={todayMacroObj.proteines}
                color="#22c55e"
              />
              <MacroBar
                label="Glucides"
                consumed={todayLog?.glucides ?? 0}
                objective={todayMacroObj.glucides}
                color="#eab308"
              />
              <MacroBar
                label="Lipides"
                consumed={todayLog?.lipides ?? 0}
                objective={todayMacroObj.lipides}
                color="#f97316"
              />
              {!activePlan && (
                <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 8 }}>
                  Aucun plan actif - importez un plan pour voir vos objectifs.
                </p>
              )}
            </div>
          </div>
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
                fontFamily: 'Syne,sans-serif',
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

          {/* Option A / B toggle */}
          {selectedPlanDay && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              {(['A', 'B'] as PlanVariant[]).map(v => (
                <button
                  key={v}
                  onClick={() => setPlanVariant(v)}
                  style={{
                    padding: '5px 14px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: planVariant === v ? 'rgba(0,200,224,0.12)' : 'var(--bg-card2)',
                    color: planVariant === v ? '#00c8e0' : 'var(--text-dim)',
                    fontWeight: planVariant === v ? 700 : 400,
                    fontSize: 12,
                    fontFamily: 'Syne,sans-serif',
                    cursor: 'pointer',
                  }}
                >
                  Option {v}
                </button>
              ))}
            </div>
          )}

          {selectedPlanDay ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {MEAL_KEYS.map(mealKey => {
                const mealSet: MealSet = planVariant === 'A'
                  ? selectedPlanDay.repas.option_A
                  : selectedPlanDay.repas.option_B
                const text = mealSet[mealKey]
                const isConsumed = selectedLog?.repas_details?.[mealKey]?.consumed ?? false
                const isToday = selectedDate === today
                return (
                  <div
                    key={mealKey}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 10,
                      background: isConsumed ? 'rgba(34,197,94,0.06)' : 'var(--bg-card2)',
                      border: `1px solid ${isConsumed ? 'rgba(34,197,94,0.25)' : 'var(--border)'}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontFamily: 'Syne,sans-serif', fontWeight: 700, color: 'var(--text-mid)' }}>
                        {MEAL_LABELS[mealKey]}
                      </span>
                      {isToday && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={isConsumed}
                            onChange={e => void handleMealToggle(mealKey, e.target.checked)}
                            disabled={savingLog}
                            style={{ accentColor: '#22c55e' }}
                          />
                          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Consomme</span>
                        </label>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--text)', lineHeight: 1.5 }}>{text}</p>
                  </div>
                )
              })}
            </div>
          ) : (
            <div>
              <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 16 }}>
                Aucun plan pour cette date. Ajoutez des repas manuellement.
              </p>
              {/* Manual entry form */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {MEAL_KEYS.map(mealKey => (
                  <div key={mealKey}>
                    <label style={{ fontSize: 11, color: 'var(--text-dim)', display: 'block', marginBottom: 3 }}>
                      {MEAL_LABELS[mealKey]}
                    </label>
                    <textarea
                      rows={2}
                      value={manualMeals[mealKey] ?? ''}
                      onChange={e => setManualMeals(m => ({ ...m, [mealKey]: e.target.value }))}
                      placeholder="Description du repas..."
                      style={{
                        width: '100%', background: 'var(--input-bg)',
                        border: '1px solid var(--border)', borderRadius: 8,
                        padding: '8px 10px', fontSize: 12, color: 'var(--text)',
                        fontFamily: 'DM Sans,sans-serif', resize: 'vertical',
                      }}
                    />
                  </div>
                ))}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {[
                    { label: 'Kcal', val: manualKcal, set: setManualKcal },
                    { label: 'Prot. (g)', val: manualP, set: setManualP },
                    { label: 'Gluc. (g)', val: manualG, set: setManualG },
                    { label: 'Lip. (g)', val: manualL, set: setManualL },
                  ].map(({ label, val, set }) => (
                    <div key={label}>
                      <label style={{ fontSize: 10, color: 'var(--text-dim)', display: 'block', marginBottom: 3 }}>{label}</label>
                      <input
                        type="number"
                        value={val}
                        onChange={e => set(e.target.value)}
                        style={{
                          width: '100%', background: 'var(--input-bg)',
                          border: '1px solid var(--border)', borderRadius: 7,
                          padding: '6px 8px', fontSize: 12, color: 'var(--text)',
                          fontFamily: 'DM Mono,monospace',
                        }}
                      />
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => void handleSaveManualLog()}
                  disabled={savingLog}
                  style={{
                    padding: '9px 0', borderRadius: 9,
                    background: 'rgba(0,200,224,0.12)',
                    border: '1px solid rgba(0,200,224,0.3)',
                    color: '#00c8e0', fontFamily: 'Syne,sans-serif',
                    fontWeight: 700, fontSize: 12, cursor: 'pointer',
                  }}
                >
                  {savingLog ? 'Sauvegarde...' : 'Sauvegarder'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════ */}
        {/* SECTION 5 — Historique et graphiques                  */}
        {/* ══════════════════════════════════════════════════════ */}
        <div style={cardStyle}>
          <p style={sectionTitle}>Historique</p>

          {/* Range toggle */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {(['7j', '14j'] as HistRange[]).map(r => (
              <button
                key={r}
                onClick={() => setHistRange(r)}
                style={{
                  padding: '5px 12px', borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: histRange === r ? 'rgba(0,200,224,0.12)' : 'var(--bg-card2)',
                  color: histRange === r ? '#00c8e0' : 'var(--text-dim)',
                  fontWeight: histRange === r ? 700 : 400,
                  fontSize: 12, fontFamily: 'Syne,sans-serif', cursor: 'pointer',
                }}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Graph 1 — Kcal history */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>
              Kcal consommees vs planifiees
            </div>
            {dailyLogs.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-dim)', padding: '16px 0' }}>
                Aucune donnee disponible
              </div>
            ) : (
              <KcalHistoryChart
                logs={dailyLogs}
                range={histRange}
                activePlan={activePlan?.plan_data ?? null}
              />
            )}
            <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 12, height: 8, borderRadius: 2, background: '#00c8e0' }} />
                <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Consomme</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 12, height: 8, borderRadius: 2, background: 'var(--border)' }} />
                <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Planifie</span>
              </div>
            </div>
          </div>

          {/* Graph 2 — Macros 7j */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>Macros 7 derniers jours (g)</div>
            {dailyLogs.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-dim)', padding: '16px 0' }}>Aucune donnee disponible</div>
            ) : (
              <MacrosChart logs={dailyLogs} activePlan={activePlan?.plan_data ?? null} />
            )}
          </div>
        </div>

        {/* Weight section */}
        <div style={cardStyle}>
          <p style={sectionTitle}>Poids et composition</p>

          {/* Metric toggle */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {([
              { key: 'poids' as WeightMetric, label: 'Poids' },
              { key: 'mg' as WeightMetric, label: 'Masse grasse' },
              { key: 'mm' as WeightMetric, label: 'Masse musculaire' },
            ]).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setWeightMetric(key)}
                style={{
                  padding: '5px 12px', borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: weightMetric === key ? 'rgba(0,200,224,0.12)' : 'var(--bg-card2)',
                  color: weightMetric === key ? '#00c8e0' : 'var(--text-dim)',
                  fontWeight: weightMetric === key ? 700 : 400,
                  fontSize: 11, fontFamily: 'Syne,sans-serif', cursor: 'pointer',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <WeightChart logs={weightLogs} metric={weightMetric} />

          {/* Weight input form */}
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 12, fontFamily: 'Syne,sans-serif', fontWeight: 700, marginBottom: 10, color: 'var(--text)' }}>
              Ajouter une mesure
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 10, color: 'var(--text-dim)', display: 'block', marginBottom: 3 }}>Date</label>
                <input
                  type="date"
                  value={weightInputDate}
                  onChange={e => setWeightInputDate(e.target.value)}
                  style={{
                    width: '100%', background: 'var(--input-bg)',
                    border: '1px solid var(--border)', borderRadius: 7,
                    padding: '6px 8px', fontSize: 12, color: 'var(--text)',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 10, color: 'var(--text-dim)', display: 'block', marginBottom: 3 }}>Poids (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={weightInput}
                  onChange={e => setWeightInput(e.target.value)}
                  placeholder="ex: 78.5"
                  style={{
                    width: '100%', background: 'var(--input-bg)',
                    border: '1px solid var(--border)', borderRadius: 7,
                    padding: '6px 8px', fontSize: 12, color: 'var(--text)',
                    fontFamily: 'DM Mono,monospace',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 10, color: 'var(--text-dim)', display: 'block', marginBottom: 3 }}>Masse grasse (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={mgInput}
                  onChange={e => setMgInput(e.target.value)}
                  placeholder="ex: 14.2"
                  style={{
                    width: '100%', background: 'var(--input-bg)',
                    border: '1px solid var(--border)', borderRadius: 7,
                    padding: '6px 8px', fontSize: 12, color: 'var(--text)',
                    fontFamily: 'DM Mono,monospace',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 10, color: 'var(--text-dim)', display: 'block', marginBottom: 3 }}>Masse musculaire (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={mmInput}
                  onChange={e => setMmInput(e.target.value)}
                  placeholder="ex: 62.1"
                  style={{
                    width: '100%', background: 'var(--input-bg)',
                    border: '1px solid var(--border)', borderRadius: 7,
                    padding: '6px 8px', fontSize: 12, color: 'var(--text)',
                    fontFamily: 'DM Mono,monospace',
                  }}
                />
              </div>
            </div>
            <button
              onClick={() => void handleSaveWeight()}
              style={{
                width: '100%', padding: '9px 0', borderRadius: 9,
                background: 'rgba(0,200,224,0.12)',
                border: '1px solid rgba(0,200,224,0.3)',
                color: '#00c8e0', fontFamily: 'Syne,sans-serif',
                fontWeight: 700, fontSize: 12, cursor: 'pointer',
              }}
            >
              Sauvegarder la mesure
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* DAY DETAIL MODAL                                          */}
      {/* ══════════════════════════════════════════════════════════ */}
      {dayDetailOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
          onClick={() => setDayDetailOpen(null)}
        >
          <div
            style={{
              width: '100%', maxWidth: 520,
              background: 'var(--bg-card)', borderRadius: '16px 16px 0 0',
              padding: 20, maxHeight: '85vh', overflowY: 'auto',
              animation: 'slideUp 0.25s ease',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: 16, color: 'var(--text)' }}>
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
                onClick={() => setDayDetailOpen(null)}
                style={{
                  background: 'none', border: 'none',
                  color: 'var(--text-dim)', fontSize: 20, cursor: 'pointer', padding: '4px 8px',
                }}
              >
                x
              </button>
            </div>

            {/* Macros summary */}
            <div style={{
              display: 'flex', gap: 12, marginBottom: 16,
              padding: '10px 12px', background: 'var(--bg-card2)',
              borderRadius: 10, border: '1px solid var(--border)',
            }}>
              {[
                { label: 'Kcal', val: dayDetailOpen.kcal, mono: true },
                { label: 'Prot', val: `${dayDetailOpen.proteines}g`, mono: true },
                { label: 'Gluc', val: `${dayDetailOpen.glucides}g`, mono: true },
                { label: 'Lip', val: `${dayDetailOpen.lipides}g`, mono: true },
              ].map(({ label, val, mono }) => (
                <div key={label} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 9, color: 'var(--text-dim)', marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 13, fontFamily: mono ? 'DM Mono,monospace' : undefined, fontWeight: 600, color: 'var(--text)' }}>
                    {val}
                  </div>
                </div>
              ))}
            </div>

            {/* Option toggle */}
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

            {/* Meals */}
            {MEAL_KEYS.map(mealKey => {
              const mealSet: MealSet = planVariant === 'A'
                ? dayDetailOpen.repas.option_A
                : dayDetailOpen.repas.option_B
              const text = mealSet[mealKey]
              return (
                <div
                  key={mealKey}
                  style={{
                    padding: '10px 12px', borderRadius: 10,
                    background: 'var(--bg-card2)',
                    border: '1px solid var(--border)',
                    marginBottom: 8,
                  }}
                >
                  <div style={{ fontSize: 10, fontFamily: 'Syne,sans-serif', fontWeight: 700, color: 'var(--text-mid)', marginBottom: 4 }}>
                    {MEAL_LABELS[mealKey]}
                  </div>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text)', lineHeight: 1.5 }}>{text}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Bouton Mes repas types */}
      <div style={{ padding: '8px 16px 24px', textAlign: 'center' }}>
        <button
          onClick={() => setShowTemplates(true)}
          style={{
            padding: '8px 18px',
            borderRadius: 9,
            border: '1px solid var(--border)',
            background: 'transparent',
            color: 'var(--text-dim)',
            fontSize: 12,
            cursor: 'pointer',
            fontFamily: 'DM Sans,sans-serif',
          }}
        >
          Mes repas types
        </button>
      </div>

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
