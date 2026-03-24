'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────
type DayIntensity = 'recovery' | 'low' | 'mid' | 'hard'
type SportType = 'run' | 'bike' | 'swim' | 'hyrox' | 'gym'

interface DaySession {
  sport: SportType
  title: string
  time: string
  duration: string
  zone?: string
  tss?: number
  main?: boolean
}

interface WeekDay {
  day: string
  date: string
  intensity: DayIntensity
  am: DaySession | null
  pm: DaySession | null
}

// ── Data ──────────────────────────────────────────
const WEEK: WeekDay[] = [
  { day: 'Lun', date: '18', intensity: 'mid',
    am: { sport: 'swim', title: 'Natation Tech', time: '06:00', duration: '55min', zone: 'Z2', tss: 45 },
    pm: null },
  { day: 'Mar', date: '19', intensity: 'hard',
    am: null,
    pm: { sport: 'bike', title: 'Sweet Spot', time: '17:30', duration: '1h45', zone: 'Z3-Z4', tss: 122, main: true } },
  { day: 'Mer', date: '20', intensity: 'low',
    am: { sport: 'run', title: 'Endurance Z2', time: '06:30', duration: '70min', zone: 'Z2', tss: 68 },
    pm: null },
  { day: 'Jeu', date: '21', intensity: 'hard',
    am: null,
    pm: { sport: 'hyrox', title: 'Hyrox Sim', time: '18:00', duration: '65min', tss: 88, main: true } },
  { day: 'Ven', date: '22', intensity: 'mid',
    am: { sport: 'swim', title: '6×100m', time: '06:00', duration: '60min', zone: 'Z3', tss: 55 },
    pm: { sport: 'run', title: 'Tempo Z3', time: '17:00', duration: '60min', zone: 'Z3', tss: 65, main: true } },
  { day: 'Sam', date: '23', intensity: 'mid',
    am: { sport: 'bike', title: 'Long Z2', time: '08:00', duration: '3h00', zone: 'Z2', tss: 120, main: true },
    pm: null },
  { day: 'Dim', date: '24', intensity: 'recovery',
    am: { sport: 'run', title: 'Récup Z1', time: '10:00', duration: '40min', zone: 'Z1', tss: 25 },
    pm: null },
]

const SPORT_EMOJI: Record<SportType, string> = {
  run: '🏃', bike: '🚴', swim: '🏊', hyrox: '🏋️', gym: '💪',
}

const SPORT_COLORS: Record<SportType, { bg: string; border: string }> = {
  run:   { bg: 'rgba(0,200,224,0.12)',   border: '#00c8e0' },
  bike:  { bg: 'rgba(91,111,255,0.12)',  border: '#5b6fff' },
  swim:  { bg: 'rgba(0,229,255,0.10)',   border: '#00e5ff' },
  hyrox: { bg: 'rgba(255,179,64,0.12)',  border: '#ffb340' },
  gym:   { bg: 'rgba(255,95,95,0.10)',   border: '#ff5f5f' },
}

const INTENSITY_CONFIG: Record<DayIntensity, {
  label: string; color: string; bg: string; border: string;
  title: string; description: string;
}> = {
  recovery: {
    label: 'Récup', color: '#9ca3af', bg: 'rgba(156,163,175,0.10)', border: 'rgba(156,163,175,0.25)',
    title: 'Jour de récupération',
    description: 'Journée sans séance ou très légère. Permet à l\'organisme de régénérer les fibres musculaires, reconstituer le glycogène et consolider les adaptations des jours précédents.',
  },
  low: {
    label: 'Low', color: '#22c55e', bg: 'rgba(34,197,94,0.10)', border: 'rgba(34,197,94,0.25)',
    title: 'Journée Low',
    description: 'Journée à faible intensité permettant de favoriser la récupération tout en continuant à stimuler l\'organisme. Elle aide à assimiler les charges d\'entraînement sans générer de fatigue supplémentaire.',
  },
  mid: {
    label: 'Mid', color: '#ffb340', bg: 'rgba(255,179,64,0.10)', border: 'rgba(255,179,64,0.25)',
    title: 'Journée Mid',
    description: 'Journée à intensité modérée, créant une fatigue contrôlée. Le temps de récupération varie selon le niveau, la charge globale et l\'état de forme.',
  },
  hard: {
    label: 'Hard', color: '#ff5f5f', bg: 'rgba(255,95,95,0.10)', border: 'rgba(255,95,95,0.25)',
    title: 'Journée Hard',
    description: 'Journée à forte intensité générant un stress important pour l\'organisme. Elle nécessite généralement un ou plusieurs jours de récupération pour être pleinement assimilée.',
  },
}

const SPORT_LABELS: Record<SportType, string> = {
  run: 'Running', bike: 'Cyclisme', swim: 'Natation', hyrox: 'Hyrox', gym: 'Musculation',
}

// ── Calculs semaine ───────────────────────────────
function getWeekStats() {
  const counts = { recovery: 0, low: 0, mid: 0, hard: 0 }
  WEEK.forEach((d) => counts[d.intensity]++)
  const totalTSS = WEEK.flatMap((d) => [d.am, d.pm]).filter(Boolean).reduce((sum, s) => sum + (s?.tss || 0), 0)
  const sportHours = { run: 0, bike: 0, swim: 0, hyrox: 0, gym: 0 }
  WEEK.flatMap((d) => [d.am, d.pm]).filter(Boolean).forEach((s) => {
    if (!s) return
    const dur = s.duration.includes('h')
      ? parseFloat(s.duration) + (s.duration.includes('min') ? parseInt(s.duration.split('min')[0].split('h')[1] || '0') / 60 : 0)
      : parseInt(s.duration) / 60
    sportHours[s.sport] = (sportHours[s.sport] || 0) + dur
  })
  return { counts, totalTSS, sportHours }
}

// ── Modal intensité ───────────────────────────────
function IntensityModal({ intensity, onClose }: { intensity: DayIntensity; onClose: () => void }) {
  const cfg = INTENSITY_CONFIG[intensity]
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--bg-card)', borderRadius: 18, border: '1px solid var(--border-mid)', padding: 28, maxWidth: 400, width: '100%', boxShadow: '0 8px 40px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <span style={{ padding: '4px 12px', borderRadius: 20, background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color, fontSize: 12, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>
            {cfg.label}
          </span>
          <h3 style={{ fontFamily: 'Syne,sans-serif', fontSize: 16, fontWeight: 700, margin: 0 }}>{cfg.title}</h3>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.7, margin: '0 0 20px' }}>{cfg.description}</p>
        <button onClick={onClose} style={{ width: '100%', padding: 11, background: 'linear-gradient(135deg,#00c8e0,#5b6fff)', border: 'none', borderRadius: 11, color: '#fff', fontFamily: 'Syne,sans-serif', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          Compris
        </button>
      </div>
    </div>
  )
}

// ── Modal ajout séance ────────────────────────────
function SessionModal({ day, onClose }: { day: WeekDay; onClose: () => void }) {
  const [sport, setSport] = useState<SportType>('run')
  const [step, setStep] = useState<'create' | 'validate'>('create')
  const [form, setForm] = useState({ title: '', duration: '', distance: '', zone: '', rpe: '', watts: '', pace: '', notes: '' })
  const [validate, setValidate] = useState({ distance: '', time: '', hr: '', watts: '', npower: '', elevation: '', pace: '' })
  const [skiDist, setSkiDist] = useState('')
  const [skiTime, setSkiTime] = useState('')
  const [rowDist, setRowDist] = useState('')
  const [rowTime, setRowTime] = useState('')

  function calcPace(dist: string, time: string) {
    const d = parseFloat(dist), t = parseFloat(time)
    if (!d || !t) return '—'
    const secPer500 = (t * 60) / (d / 500)
    const min = Math.floor(secPer500 / 60), sec = Math.round(secPer500 % 60)
    return `${min}:${String(sec).padStart(2, '0')}/500m`
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflowY: 'auto' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--bg-card)', borderRadius: 18, border: '1px solid var(--border-mid)', padding: 24, maxWidth: 520, width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,0.25)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h3 style={{ fontFamily: 'Syne,sans-serif', fontSize: 17, fontWeight: 700, margin: 0 }}>
              {step === 'create' ? `Ajouter une séance` : 'Valider la séance'}
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: '4px 0 0' }}>
              {day.day} {day.date} mars
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 9, padding: '6px 10px', cursor: 'pointer', color: 'var(--text-dim)', fontSize: 16 }}>✕</button>
        </div>

        {step === 'create' ? (
          <>
            {/* Sport selector */}
            <div style={{ marginBottom: 18 }}>
              <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: 'var(--text-dim)', marginBottom: 8 }}>Sport</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                {(Object.keys(SPORT_LABELS) as SportType[]).map((s) => (
                  <button key={s} onClick={() => setSport(s)} style={{ padding: '7px 14px', borderRadius: 9, border: '1px solid', borderColor: sport === s ? '#00c8e0' : 'var(--border)', background: sport === s ? 'rgba(0,200,224,0.10)' : 'var(--bg-card2)', color: sport === s ? '#00c8e0' : 'var(--text-mid)', fontFamily: 'DM Sans,sans-serif', fontSize: 13, cursor: 'pointer' }}>
                    {SPORT_EMOJI[s]} {SPORT_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>

            {/* Titre */}
            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: 'var(--text-dim)', marginBottom: 6 }}>Titre de la séance</p>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Tempo 3×10min" style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontFamily: 'DM Sans,sans-serif', fontSize: 13, outline: 'none' }}/>
            </div>

            {/* Endurance fields */}
            {['run', 'bike', 'swim'].includes(sport) && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                {[
                  { key: 'duration', label: 'Durée', placeholder: '60min' },
                  { key: 'distance', label: 'Distance', placeholder: '10km' },
                  { key: 'zone', label: 'Zone', placeholder: 'Z2, Z3...' },
                  { key: 'rpe', label: 'RPE', placeholder: '1–10' },
                  ...(sport === 'bike' ? [{ key: 'watts', label: 'Watts cible', placeholder: '250W' }] : []),
                  ...(sport === 'run' ? [{ key: 'pace', label: 'Allure cible', placeholder: "4'30/km" }] : []),
                ].map((f) => (
                  <div key={f.key}>
                    <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: 'var(--text-dim)', marginBottom: 5 }}>{f.label}</p>
                    <input value={(form as any)[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.placeholder} style={{ width: '100%', padding: '8px 12px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontFamily: 'DM Sans,sans-serif', fontSize: 13, outline: 'none' }}/>
                  </div>
                ))}
              </div>
            )}

            {/* Hyrox fields */}
            {sport === 'hyrox' && (
              <div style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: 'var(--text-dim)', marginBottom: 10 }}>Stations Hyrox</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { label: 'SkiErg (m)', key: 'ski' }, { label: 'Sled Push (m)', key: 'sled_push' },
                    { label: 'Sled Pull (m)', key: 'sled_pull' }, { label: 'Burpee BJ (m)', key: 'burpee' },
                    { label: 'Row Erg (m)', key: 'row' }, { label: 'Farmers (m)', key: 'farmers' },
                    { label: 'Sandbag (reps)', key: 'sandbag' }, { label: 'Wall Balls (reps)', key: 'wallball' },
                  ].map((f) => (
                    <div key={f.key}>
                      <p style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 4 }}>{f.label}</p>
                      <input placeholder="—" style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 12, outline: 'none' }}/>
                    </div>
                  ))}
                </div>

                {/* Calcul allure SkiErg */}
                <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 10, background: 'rgba(0,200,224,0.06)', border: '1px solid rgba(0,200,224,0.15)' }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#00c8e0', marginBottom: 8 }}>⚡ Calcul allure SkiErg / Rameur</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
                    <div>
                      <p style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 3 }}>SkiErg dist (m)</p>
                      <input value={skiDist} onChange={(e) => setSkiDist(e.target.value)} placeholder="1000" style={{ width: '100%', padding: '6px 9px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--input-bg)', fontSize: 12, color: 'var(--text)', outline: 'none' }}/>
                    </div>
                    <div>
                      <p style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 3 }}>Durée (min)</p>
                      <input value={skiTime} onChange={(e) => setSkiTime(e.target.value)} placeholder="4" style={{ width: '100%', padding: '6px 9px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--input-bg)', fontSize: 12, color: 'var(--text)', outline: 'none' }}/>
                    </div>
                    <div>
                      <p style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 3 }}>Allure moy.</p>
                      <div style={{ padding: '6px 9px', borderRadius: 7, background: 'rgba(0,200,224,0.10)', border: '1px solid rgba(0,200,224,0.2)', fontSize: 12, fontWeight: 600, color: '#00c8e0', fontFamily: 'DM Mono,monospace' }}>
                        {calcPace(skiDist, skiTime)}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    <div>
                      <p style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 3 }}>Rameur dist (m)</p>
                      <input value={rowDist} onChange={(e) => setRowDist(e.target.value)} placeholder="1000" style={{ width: '100%', padding: '6px 9px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--input-bg)', fontSize: 12, color: 'var(--text)', outline: 'none' }}/>
                    </div>
                    <div>
                      <p style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 3 }}>Durée (min)</p>
                      <input value={rowTime} onChange={(e) => setRowTime(e.target.value)} placeholder="4" style={{ width: '100%', padding: '6px 9px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--input-bg)', fontSize: 12, color: 'var(--text)', outline: 'none' }}/>
                    </div>
                    <div>
                      <p style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 3 }}>Allure moy.</p>
                      <div style={{ padding: '6px 9px', borderRadius: 7, background: 'rgba(0,200,224,0.10)', border: '1px solid rgba(0,200,224,0.2)', fontSize: 12, fontWeight: 600, color: '#00c8e0', fontFamily: 'DM Mono,monospace' }}>
                        {calcPace(rowDist, rowTime)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Gym fields */}
            {sport === 'gym' && (
              <div style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: 'var(--text-dim)', marginBottom: 8 }}>Musculation</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { label: 'Durée', placeholder: '60min' },
                    { label: 'RPE', placeholder: '1–10' },
                  ].map((f) => (
                    <div key={f.label}>
                      <p style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 4 }}>{f.label}</p>
                      <input placeholder={f.placeholder} style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 12, outline: 'none' }}/>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Commentaire */}
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: 'var(--text-dim)', marginBottom: 6 }}>Commentaire / Consignes</p>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Indications, objectifs, notes pour cette séance…" rows={3} style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontFamily: 'DM Sans,sans-serif', fontSize: 13, outline: 'none', resize: 'none' as const }}/>
            </div>

            {/* Boutons */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onClose} style={{ flex: 1, padding: 11, borderRadius: 11, background: 'var(--bg-card2)', border: '1px solid var(--border)', color: 'var(--text-mid)', fontFamily: 'DM Sans,sans-serif', fontSize: 13, cursor: 'pointer' }}>
                Annuler
              </button>
              <button onClick={() => setStep('validate')} style={{ flex: 2, padding: 11, borderRadius: 11, background: 'linear-gradient(135deg,#00c8e0,#5b6fff)', border: 'none', color: '#fff', fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                Valider la séance →
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Validation */}
            <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(0,200,224,0.07)', border: '1px solid rgba(0,200,224,0.15)', marginBottom: 18 }}>
              <p style={{ fontSize: 12, color: '#00c8e0', fontWeight: 600, margin: 0 }}>Option 1 — Saisie manuelle</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
              {[
                { key: 'distance', label: 'Distance', placeholder: '10km' },
                { key: 'time',     label: 'Temps total', placeholder: '1h05' },
                { key: 'hr',       label: 'FC moyenne', placeholder: '158bpm' },
                { key: 'pace',     label: 'Allure moyenne', placeholder: "4'32/km" },
                { key: 'watts',    label: 'Watts moyens', placeholder: '240W' },
                { key: 'npower',   label: 'Watts normalisés', placeholder: '247W' },
                { key: 'elevation',label: 'Dénivelé', placeholder: '450m' },
              ].map((f) => (
                <div key={f.key}>
                  <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'var(--text-dim)', marginBottom: 5 }}>{f.label}</p>
                  <input value={(validate as any)[f.key]} onChange={(e) => setValidate({ ...validate, [f.key]: e.target.value })} placeholder={f.placeholder} style={{ width: '100%', padding: '8px 12px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontFamily: 'DM Sans,sans-serif', fontSize: 13, outline: 'none' }}/>
                </div>
              ))}
            </div>

            <div style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--bg-card2)', border: '1px solid var(--border)', marginBottom: 18 }}>
              <p style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 500, margin: '0 0 4px' }}>Option 2 — Synchronisation (bientôt)</p>
              <div style={{ display: 'flex', gap: 8 }}>
                {['Garmin', 'Strava', 'Polar'].map((app) => (
                  <span key={app} style={{ padding: '4px 10px', borderRadius: 7, background: 'var(--bg-card)', border: '1px solid var(--border)', fontSize: 11, color: 'var(--text-dim)' }}>{app}</span>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep('create')} style={{ flex: 1, padding: 11, borderRadius: 11, background: 'var(--bg-card2)', border: '1px solid var(--border)', color: 'var(--text-mid)', fontFamily: 'DM Sans,sans-serif', fontSize: 13, cursor: 'pointer' }}>
                ← Retour
              </button>
              <button onClick={onClose} style={{ flex: 2, padding: 11, borderRadius: 11, background: 'linear-gradient(135deg,#00c8e0,#5b6fff)', border: 'none', color: '#fff', fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                ✓ Confirmer la séance
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════
export default function PlanningPage() {
  const [intensityModal, setIntensityModal] = useState<DayIntensity | null>(null)
  const [sessionModal, setSessionModal]     = useState<WeekDay | null>(null)
  const stats = getWeekStats()

  const sportColors = ['#5b6fff', '#00c8e0', '#00e5ff', '#ffb340', '#ff5f5f']
  const sportEntries = Object.entries(stats.sportHours).filter(([, h]) => h > 0)
  const totalH = sportEntries.reduce((sum, [, h]) => sum + h, 0)

  return (
    <div style={{ padding: '24px 28px', maxWidth: '100%' }}>

      {/* Modals */}
      {intensityModal && <IntensityModal intensity={intensityModal} onClose={() => setIntensityModal(null)} />}
      {sessionModal   && <SessionModal  day={sessionModal}          onClose={() => setSessionModal(null)} />}

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap' as const, gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne,sans-serif', fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em', margin: 0 }}>Planning</h1>
          <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: '5px 0 0' }}>
            Semaine 12 — 18 au 24 mars · Bloc construction
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ padding: '8px 14px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border-mid)', color: 'var(--text-mid)', fontSize: 13, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>← Préc.</button>
          <button style={{ padding: '8px 14px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border-mid)', color: 'var(--text-mid)', fontSize: 13, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>Suiv. →</button>
        </div>
      </div>

      {/* ── Stats semaine ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginBottom: 20 }} className="md:grid-cols-4">

        {/* Volume anneau */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 18, boxShadow: 'var(--shadow-card)', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ position: 'relative', width: 64, height: 64, flexShrink: 0 }}>
            <svg width="64" height="64" viewBox="0 0 64 64" style={{ transform: 'rotate(-90deg)' }}>
              {sportEntries.map(([sport, h], i) => {
                const pct = h / totalH
                const circumference = 2 * Math.PI * 26
                const prev = sportEntries.slice(0, i).reduce((s, [, v]) => s + v / totalH, 0)
                return (
                  <circle key={sport} cx="32" cy="32" r="26" fill="none"
                    stroke={sportColors[i % sportColors.length]}
                    strokeWidth="8" strokeLinecap="butt"
                    strokeDasharray={`${pct * circumference} ${circumference}`}
                    strokeDashoffset={-prev * circumference}
                    opacity={0.8}
                  />
                )
              })}
              <circle cx="32" cy="32" r="26" fill="none" stroke="var(--border)" strokeWidth="8"/>
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 14, color: '#00c8e0' }}>
                {totalH.toFixed(1)}h
              </span>
            </div>
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: 'var(--text-dim)', margin: '0 0 4px' }}>Volume total</p>
            <p style={{ fontFamily: 'Syne,sans-serif', fontSize: 22, fontWeight: 700, color: '#00c8e0', margin: 0 }}>{totalH.toFixed(1)}<span style={{ fontSize: 12, color: 'var(--text-dim)', marginLeft: 3 }}>h</span></p>
            <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: '2px 0 0' }}>{stats.totalTSS} TSS prévu</p>
          </div>
        </div>

        {/* Équilibre intensités */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 18, boxShadow: 'var(--shadow-card)' }}>
          <p style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: 'var(--text-dim)', margin: '0 0 10px' }}>Équilibre semaine</p>
          <div style={{ display: 'flex', gap: 3, height: 8, borderRadius: 999, overflow: 'hidden', marginBottom: 10 }}>
            {(Object.entries(stats.counts) as [DayIntensity, number][]).filter(([, v]) => v > 0).map(([k, v]) => (
              <div key={k} style={{ flex: v, background: INTENSITY_CONFIG[k].color, opacity: 0.7 }}/>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
            {(Object.entries(stats.counts) as [DayIntensity, number][]).filter(([, v]) => v > 0).map(([k, v]) => (
              <span key={k} style={{ padding: '2px 8px', borderRadius: 20, background: INTENSITY_CONFIG[k].bg, border: `1px solid ${INTENSITY_CONFIG[k].border}`, color: INTENSITY_CONFIG[k].color, fontSize: 11, fontWeight: 600 }}>
                {v} {INTENSITY_CONFIG[k].label}
              </span>
            ))}
          </div>
        </div>

        {/* Séances count */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 18, boxShadow: 'var(--shadow-card)' }}>
          <p style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: 'var(--text-dim)', margin: '0 0 8px' }}>Séances</p>
          <p style={{ fontFamily: 'Syne,sans-serif', fontSize: 30, fontWeight: 700, color: '#ffb340', margin: 0 }}>
            {WEEK.flatMap((d) => [d.am, d.pm]).filter(Boolean).length}
            <span style={{ fontSize: 13, color: 'var(--text-dim)', marginLeft: 4 }}>cette sem.</span>
          </p>
        </div>

        {/* TSS */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 18, boxShadow: 'var(--shadow-card)' }}>
          <p style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: 'var(--text-dim)', margin: '0 0 8px' }}>TSS prévu</p>
          <p style={{ fontFamily: 'Syne,sans-serif', fontSize: 30, fontWeight: 700, color: '#5b6fff', margin: 0 }}>
            {stats.totalTSS}
            <span style={{ fontSize: 13, color: 'var(--text-dim)', marginLeft: 4 }}>pts</span>
          </p>
        </div>
      </div>

      {/* ── GRILLE SEMAINE DESKTOP ── */}
      <div className="hidden md:block" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, boxShadow: 'var(--shadow-card)', marginBottom: 16, overflowX: 'auto' }}>
        <div style={{ minWidth: 640 }}>

          {/* Headers jours */}
          <div style={{ display: 'grid', gridTemplateColumns: '48px repeat(7,1fr)', gap: 6, marginBottom: 8 }}>
            <div/>
            {WEEK.map((d) => (
              <div key={d.day} style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase' as const, letterSpacing: '0.06em', margin: '0 0 2px', fontWeight: 500 }}>{d.day}</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: '0 0 6px' }}>{d.date}</p>
                {/* Badge intensité */}
                <button
                  onClick={() => setIntensityModal(d.intensity)}
                  style={{ padding: '2px 8px', borderRadius: 20, background: INTENSITY_CONFIG[d.intensity].bg, border: `1px solid ${INTENSITY_CONFIG[d.intensity].border}`, color: INTENSITY_CONFIG[d.intensity].color, fontSize: 10, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.04em' }}
                >
                  {INTENSITY_CONFIG[d.intensity].label}
                </button>
              </div>
            ))}
          </div>

          {/* AM */}
          <div style={{ display: 'grid', gridTemplateColumns: '48px repeat(7,1fr)', gap: 6, marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', paddingRight: 8, paddingTop: 6 }}>
              <span style={{ fontSize: 10, fontFamily: 'DM Mono,monospace', color: 'var(--text-dim)' }}>AM</span>
            </div>
            {WEEK.map((d) => (
              <div key={d.day}
                onClick={() => setSessionModal(d)}
                style={{ minHeight: 56, borderRadius: 9, background: 'var(--bg-card2)', border: '1px solid var(--border)', cursor: 'pointer', position: 'relative', overflow: 'hidden', transition: 'all 0.2s' }}
              >
                {d.am && (
                  <div style={{ position: 'absolute', inset: 3, borderRadius: 6, padding: '5px 7px', background: SPORT_COLORS[d.am.sport].bg, borderLeft: `2px solid ${SPORT_COLORS[d.am.sport].border}` }}>
                    <p style={{ fontSize: 10, fontWeight: 600, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {SPORT_EMOJI[d.am.sport]} {d.am.title}
                    </p>
                    <p style={{ fontSize: 9, opacity: 0.7, margin: '2px 0 0' }}>{d.am.time} · {d.am.duration}</p>
                    {d.am.zone && <p style={{ fontSize: 9, opacity: 0.7, margin: '1px 0 0', fontFamily: 'DM Mono,monospace' }}>{d.am.zone}</p>}
                    {d.am.main && <span style={{ position: 'absolute', top: 4, right: 4, width: 5, height: 5, borderRadius: '50%', background: SPORT_COLORS[d.am.sport].border }}/>}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* PM */}
          <div style={{ display: 'grid', gridTemplateColumns: '48px repeat(7,1fr)', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', paddingRight: 8, paddingTop: 6 }}>
              <span style={{ fontSize: 10, fontFamily: 'DM Mono,monospace', color: 'var(--text-dim)' }}>PM</span>
            </div>
            {WEEK.map((d) => (
              <div key={d.day}
                onClick={() => setSessionModal(d)}
                style={{ minHeight: 56, borderRadius: 9, background: 'var(--bg-card2)', border: '1px solid var(--border)', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
              >
                {d.pm && (
                  <div style={{ position: 'absolute', inset: 3, borderRadius: 6, padding: '5px 7px', background: SPORT_COLORS[d.pm.sport].bg, borderLeft: `2px solid ${SPORT_COLORS[d.pm.sport].border}` }}>
                    <p style={{ fontSize: 10, fontWeight: 600, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {SPORT_EMOJI[d.pm.sport]} {d.pm.title}
                    </p>
                    <p style={{ fontSize: 9, opacity: 0.7, margin: '2px 0 0' }}>{d.pm.time} · {d.pm.duration}</p>
                    {d.pm.zone && <p style={{ fontSize: 9, opacity: 0.7, margin: '1px 0 0', fontFamily: 'DM Mono,monospace' }}>{d.pm.zone}</p>}
                    {d.pm.main && <span style={{ position: 'absolute', top: 4, right: 4, width: 5, height: 5, borderRadius: '50%', background: SPORT_COLORS[d.pm.sport].border }}/>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── MOBILE : liste des jours ── */}
      <div className="md:hidden" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {WEEK.map((d) => {
          const cfg = INTENSITY_CONFIG[d.intensity]
          const sessions = [d.am, d.pm].filter(Boolean) as DaySession[]
          return (
            <div key={d.day} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 14, boxShadow: 'var(--shadow-card)' }}>
              {/* Header jour */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: sessions.length ? 10 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ textAlign: 'center' as const, minWidth: 36 }}>
                    <p style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase' as const, letterSpacing: '0.06em', margin: 0 }}>{d.day}</p>
                    <p style={{ fontFamily: 'Syne,sans-serif', fontSize: 18, fontWeight: 700, margin: 0 }}>{d.date}</p>
                  </div>
                  <button onClick={() => setIntensityModal(d.intensity)} style={{ padding: '3px 10px', borderRadius: 20, background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                    {cfg.label}
                  </button>
                </div>
                <button onClick={() => setSessionModal(d)} style={{ padding: '5px 10px', borderRadius: 8, background: 'rgba(0,200,224,0.08)', border: '1px solid rgba(0,200,224,0.2)', color: '#00c8e0', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                  + Ajouter
                </button>
              </div>

              {sessions.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {sessions.map((s, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, background: SPORT_COLORS[s.sport].bg, borderLeft: `3px solid ${SPORT_COLORS[s.sport].border}` }}>
                      <span style={{ fontSize: 16 }}>{SPORT_EMOJI[s.sport]}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: s.main ? 600 : 400, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                          {s.title}
                          {s.main && <span style={{ fontSize: 9, marginLeft: 5, padding: '1px 5px', borderRadius: 4, background: SPORT_COLORS[s.sport].border, color: '#fff' }}>PRINCIPALE</span>}
                        </p>
                        <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: '2px 0 0' }}>
                          {s.time} · {s.duration}{s.zone ? ` · ${s.zone}` : ''}{s.tss ? ` · ${s.tss} TSS` : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {sessions.length === 0 && (
                <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: 0, fontStyle: 'italic' as const }}>Jour de repos</p>
              )}
            </div>
          )
        })}
      </div>

    </div>
  )
}
