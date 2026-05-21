'use client'
import { useState, useMemo } from 'react'
import { useBodyMetrics, getMetricValue } from '@/hooks/useBodyMetrics'
import type { BodyMeasurement } from '@/hooks/useBodyMetrics'
import { useProfile } from '@/hooks/useProfile'
import WeightChart from './WeightChart'

// ── Stepper config ────────────────────────────────────────────────
type StepKey = 'weight_kg' | 'fat_mass_percent' | 'muscle_mass_kg' | 'metabolic_age'
const STEPPERS: { key: StepKey; label: string; unit: string; step: number; start: number; dec: number; optional: boolean }[] = [
  { key: 'weight_kg',        label: 'Poids',           unit: 'kg',  step: 0.1, start: 70,  dec: 1, optional: false },
  { key: 'fat_mass_percent', label: 'Masse grasse',     unit: '%',   step: 0.1, start: 15,  dec: 1, optional: true  },
  { key: 'muscle_mass_kg',   label: 'Masse musc.',      unit: 'kg',  step: 0.1, start: 60,  dec: 1, optional: true  },
  { key: 'metabolic_age',    label: 'Age metabolique',  unit: 'ans', step: 1,   start: 35,  dec: 0, optional: true  },
]
type Period = '3m' | '6m' | '1y' | '5y'

function roundDec(n: number, dec: number) {
  return Math.round(n * 10 ** dec) / 10 ** dec
}
function stepUp(val: string, cfg: typeof STEPPERS[0]): string {
  const n = parseFloat(val)
  return roundDec(isNaN(n) ? cfg.start : n + cfg.step, cfg.dec).toFixed(cfg.dec)
}
function stepDown(val: string, cfg: typeof STEPPERS[0]): string {
  const n = parseFloat(val)
  if (isNaN(n) || n <= cfg.step) return ''
  return roundDec(n - cfg.step, cfg.dec).toFixed(cfg.dec)
}

// ── SVG Icons ─────────────────────────────────────────────────────
function IconPencil() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4z" />
    </svg>
  )
}
function IconTrash() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
      <path d="M10 11v6M14 11v6M9 6V4h6v2" />
    </svg>
  )
}
function IconCheck() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
function IconX() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}
function Spinner() {
  return (
    <>
      <style>{`@keyframes ws{to{transform:rotate(360deg)}}`}</style>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ animation: 'ws 0.8s linear infinite', display: 'block' }}>
        <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
        <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </>
  )
}

// ── History table ─────────────────────────────────────────────────
type EditRowState = { measured_at: string; weight_kg: string; fat_mass_percent: string; muscle_mass_kg: string; metabolic_age: string }

function HistoryTable({
  measurements, heightCm, onUpdate, onDelete,
}: {
  measurements: BodyMeasurement[]
  heightCm: number | null
  onUpdate: (id: string, patch: Partial<Omit<BodyMeasurement, 'id' | 'user_id' | 'created_at'>>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editRow, setEditRow] = useState<EditRowState | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const sorted = [...measurements].sort((a, b) => b.measured_at.localeCompare(a.measured_at))

  function startEdit(m: BodyMeasurement) {
    setEditingId(m.id)
    setEditRow({
      measured_at:      m.measured_at,
      weight_kg:        m.weight_kg?.toString()        ?? '',
      fat_mass_percent: m.fat_mass_percent?.toString() ?? '',
      muscle_mass_kg:   m.muscle_mass_kg?.toString()   ?? '',
      metabolic_age:    m.metabolic_age?.toString()    ?? '',
    })
  }

  async function commitEdit() {
    if (!editingId || !editRow) return
    await onUpdate(editingId, {
      measured_at:      editRow.measured_at,
      weight_kg:        editRow.weight_kg        ? parseFloat(editRow.weight_kg)        : null,
      fat_mass_percent: editRow.fat_mass_percent ? parseFloat(editRow.fat_mass_percent) : null,
      muscle_mass_kg:   editRow.muscle_mass_kg   ? parseFloat(editRow.muscle_mass_kg)   : null,
      metabolic_age:    editRow.metabolic_age    ? parseInt(editRow.metabolic_age)      : null,
    })
    setEditingId(null); setEditRow(null)
  }

  const cellInput = (field: keyof EditRowState, type = 'number') => (
    <input
      type={type} value={editRow?.[field] ?? ''}
      onChange={e => setEditRow(r => r ? { ...r, [field]: e.target.value } : r)}
      style={{
        width: '100%', padding: '3px 5px', borderRadius: 5,
        border: '1px solid #06B6D4', background: 'var(--bg-card)',
        color: 'var(--text)', fontSize: 11, outline: 'none', boxSizing: 'border-box',
      }}
    />
  )

  const tdBase: React.CSSProperties = { padding: '7px 8px', fontSize: 11, color: 'var(--text)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }

  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>Mes mesures</div>
      {sorted.length === 0 ? (
        <div style={{ color: 'var(--text-dim)', fontSize: 12, padding: '12px 0' }}>Aucune mesure enregistree</div>
      ) : (
        <div style={{ maxHeight: 256, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 10 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-card2)' }}>
                {['Date', 'Poids', 'MG%', 'MM kg', 'IMC', ''].map(h => (
                  <th key={h} style={{ ...tdBase, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map(m => {
                const bmi = m.weight_kg && heightCm
                  ? (m.weight_kg / ((heightCm / 100) ** 2)).toFixed(1)
                  : '--'

                if (confirmId === m.id) {
                  return (
                    <tr key={m.id}>
                      <td colSpan={6} style={{ ...tdBase, background: 'rgba(239,68,68,0.06)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Supprimer cette mesure ?</span>
                          <button onClick={() => void onDelete(m.id).then(() => setConfirmId(null))}
                            style={{ padding: '3px 10px', borderRadius: 6, border: 'none', background: '#ef4444', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                            Oui
                          </button>
                          <button onClick={() => setConfirmId(null)}
                            style={{ padding: '3px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-dim)', fontSize: 11, cursor: 'pointer' }}>
                            Non
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                }

                const isEditing = editingId === m.id
                return (
                  <tr key={m.id} style={{ background: 'var(--bg-card)' }}>
                    <td style={tdBase}>{isEditing ? cellInput('measured_at', 'date') : m.measured_at}</td>
                    <td style={tdBase}>{isEditing ? cellInput('weight_kg') : (m.weight_kg?.toFixed(1) ?? '--')}</td>
                    <td style={tdBase}>{isEditing ? cellInput('fat_mass_percent') : (m.fat_mass_percent?.toFixed(1) ?? '--')}</td>
                    <td style={tdBase}>{isEditing ? cellInput('muscle_mass_kg') : (m.muscle_mass_kg?.toFixed(1) ?? '--')}</td>
                    <td style={{ ...tdBase, color: 'var(--text-dim)' }}>{bmi}</td>
                    <td style={{ ...tdBase, minWidth: 64 }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => void commitEdit()} title="Valider"
                            style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid rgba(34,197,94,0.4)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <IconCheck />
                          </button>
                          <button onClick={() => { setEditingId(null); setEditRow(null) }} title="Annuler"
                            style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid rgba(239,68,68,0.3)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <IconX />
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => startEdit(m)} title="Modifier"
                            style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <IconPencil />
                          </button>
                          <button onClick={() => setConfirmId(m.id)} title="Supprimer"
                            style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid rgba(239,68,68,0.3)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <IconTrash />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────
export default function WeightSection() {
  const { measurements, loading, addMeasurement, updateMeasurement, deleteMeasurement } = useBodyMetrics()
  const { profile } = useProfile()
  const heightCm = profile?.height_cm ?? null
  const targetWeight = profile?.weight_kg ?? null

  const [period, setPeriod] = useState<Period>('3m')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [form, setForm] = useState<Record<StepKey, string>>({ weight_kg: '', fat_mass_percent: '', muscle_mass_kg: '', metabolic_age: '' })
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const filtered = useMemo(() => {
    const daysBack: Record<Period, number> = { '3m': 90, '6m': 180, '1y': 365, '5y': 1825 }
    const cutoff = new Date(Date.now() - daysBack[period] * 86400000).toISOString().split('T')[0]
    return measurements.filter(m => m.measured_at >= cutoff)
  }, [measurements, period])

  const last = [...measurements].sort((a, b) => b.measured_at.localeCompare(a.measured_at))[0]

  async function handleSave() {
    if (!form.weight_kg) return
    setSaving(true)
    try {
      await addMeasurement({
        measured_at:      date,
        weight_kg:        parseFloat(form.weight_kg),
        fat_mass_percent: form.fat_mass_percent ? parseFloat(form.fat_mass_percent) : null,
        muscle_mass_kg:   form.muscle_mass_kg   ? parseFloat(form.muscle_mass_kg)   : null,
        metabolic_age:    form.metabolic_age    ? parseInt(form.metabolic_age)      : null,
        notes: null, source: 'manual',
      })
      setDate(new Date().toISOString().split('T')[0])
      setForm({ weight_kg: '', fat_mass_percent: '', muscle_mass_kg: '', metabolic_age: '' })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 1500)
    } catch (err) {
      console.error('[WeightSection.handleSave]', err)
    } finally {
      setSaving(false)
    }
  }

  const canSave = !!form.weight_kg && !saving
  const btnBg = saveSuccess ? '#22C55E' : (canSave || saving) ? 'linear-gradient(90deg,#06B6D4,#3B82F6)' : 'var(--border)'

  const cardStyle: React.CSSProperties = { background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', padding: 20, marginBottom: 16 }
  const iStyle: React.CSSProperties = { padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text)', fontSize: 12, outline: 'none', fontFamily: 'DM Mono,monospace', textAlign: 'center' as const, width: 72, boxSizing: 'border-box' as const }
  const btnRnd: React.CSSProperties = { width: 28, height: 28, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }

  return (
    <div style={cardStyle}>
      <p style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 18, color: 'var(--text)', margin: '0 0 16px' }}>
        Poids et composition
      </p>

      {/* Last measurement pills */}
      {last && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {last.weight_kg != null && (
            <span style={{ padding: '3px 10px', borderRadius: 20, background: 'rgba(6,182,212,0.12)', border: '1px solid #06B6D4', color: '#06B6D4', fontSize: 11, fontFamily: 'DM Mono,monospace', fontWeight: 600 }}>
              {last.weight_kg.toFixed(1)} kg
            </span>
          )}
          {last.fat_mass_percent != null && (
            <span style={{ padding: '3px 10px', borderRadius: 20, background: 'rgba(249,115,22,0.12)', border: '1px solid #F97316', color: '#F97316', fontSize: 11, fontFamily: 'DM Mono,monospace', fontWeight: 600 }}>
              {last.fat_mass_percent.toFixed(1)}% MG
            </span>
          )}
          {last.muscle_mass_kg != null && (
            <span style={{ padding: '3px 10px', borderRadius: 20, background: 'rgba(59,130,246,0.12)', border: '1px solid #3B82F6', color: '#3B82F6', fontSize: 11, fontFamily: 'DM Mono,monospace', fontWeight: 600 }}>
              {last.muscle_mass_kg.toFixed(1)} kg MM
            </span>
          )}
          {last.weight_kg && heightCm && (
            <span style={{ padding: '3px 10px', borderRadius: 20, background: 'rgba(139,92,246,0.12)', border: '1px solid #8B5CF6', color: '#8B5CF6', fontSize: 11, fontFamily: 'DM Mono,monospace', fontWeight: 600 }}>
              IMC {(last.weight_kg / ((heightCm / 100) ** 2)).toFixed(1)}
            </span>
          )}
          <div style={{ fontSize: 10, color: 'var(--text-dim)', alignSelf: 'center', marginLeft: 2 }}>
            Derniere mesure : {new Date(last.measured_at + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </div>
        </div>
      )}

      {/* Period toggle */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {([['3m', '3 mois'], ['6m', '6 mois'], ['1y', '1 an'], ['5y', '5 ans']] as [Period, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setPeriod(key)}
            style={{
              padding: '5px 14px', borderRadius: 20, cursor: 'pointer', fontSize: 11, fontFamily: 'Syne,sans-serif',
              border: period === key ? 'none' : '1px solid var(--border)',
              background: period === key ? 'linear-gradient(90deg,#06B6D4,#3B82F6)' : 'transparent',
              color: period === key ? '#fff' : 'var(--text-dim)',
              fontWeight: period === key ? 700 : 400,
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* Chart */}
      {loading ? (
        <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontSize: 13 }}>
          Chargement...
        </div>
      ) : (
        <WeightChart measurements={filtered} heightCm={heightCm} targetWeight={targetWeight} />
      )}

      {/* Form */}
      <div style={{ marginTop: 24, borderTop: '1px solid var(--border)', paddingTop: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 14 }}>Ajouter une mesure</div>

        {/* Date */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 10, color: 'var(--text-dim)', display: 'block', marginBottom: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            style={{ background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', fontSize: 12, color: 'var(--text)', outline: 'none' }}
          />
        </div>

        {/* Stepper rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {STEPPERS.map(cfg => (
            <div key={cfg.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500 }}>{cfg.label}</span>
                {cfg.optional && (
                  <span style={{ fontSize: 10, color: 'var(--text-dim)', marginLeft: 5 }}>(optionnel)</span>
                )}
              </div>
              <button onClick={() => setForm(f => ({ ...f, [cfg.key]: stepDown(f[cfg.key], cfg) }))}
                style={btnRnd} aria-label="Diminuer">−</button>
              <input
                type="number" value={form[cfg.key]}
                onChange={e => setForm(f => ({ ...f, [cfg.key]: e.target.value }))}
                placeholder="—"
                style={iStyle}
              />
              <button onClick={() => setForm(f => ({ ...f, [cfg.key]: stepUp(f[cfg.key], cfg) }))}
                style={btnRnd} aria-label="Augmenter">+</button>
              <span style={{ fontSize: 11, color: 'var(--text-dim)', width: 28, textAlign: 'left' }}>{cfg.unit}</span>
            </div>
          ))}
        </div>

        {/* Save button */}
        <button
          onClick={() => void handleSave()}
          disabled={!canSave && !saving}
          style={{
            width: '100%', height: 42, borderRadius: 10, border: 'none',
            background: btnBg, color: '#fff',
            fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 13,
            cursor: canSave || saving ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.3s',
          }}
        >
          {saving ? <Spinner /> : 'Sauvegarder la mesure'}
        </button>
      </div>

      {/* History */}
      <div style={{ marginTop: 24, borderTop: '1px solid var(--border)', paddingTop: 20 }}>
        <HistoryTable
          measurements={measurements}
          heightCm={heightCm}
          onUpdate={updateMeasurement}
          onDelete={deleteMeasurement}
        />
      </div>
    </div>
  )
}
