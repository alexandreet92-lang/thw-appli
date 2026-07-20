'use client'
// Saisie MANUELLE d'une activité (tous sports). Sur-page coulissante bas→haut.
// Étape 1 : choix du sport (logos SportIcon, PAS d'emoji). Étape 2 : champs
// communs + détail STRUCTURÉ propre au sport, en RÉUTILISANT EXACTEMENT les
// builders de la page planning :
//   - endurance (run/bike/swim/rowing/elliptique/trail) → SessionBlockBuilder
//     (profil d'intensité + blocs Z, identique au planning) ; course tapis via
//     runningSub='treadmill' (blocs km/h + pente) → profil altimétrique généré.
//   - muscu → StrengthBuilder ; hyrox → HyroxBuilder ; boxe → ComposedBuilder.
//   - autres (rando, ski, yoga, padel…) → durée + distance + dénivelé simples.
//
// Dénivelé (m) saisissable pour course/vélo/trail/rando. Écrit dans activities
// (+ streams pour le tapis) et workout_sessions. Rien de fabriqué : champs vides
// = non enregistrés / non affichés.
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { SportIcon } from '@/components/icons/SportIcon'
import { SessionBlockBuilder } from '@/components/planning/mobile/SessionBlockBuilder'
import { StrengthBuilder } from '@/components/planning/mobile/StrengthBuilder'
import { HyroxBuilder } from '@/components/planning/mobile/HyroxBuilder'
import { ComposedBuilder } from '@/components/planning/ComposedBuilder'
import { sportColor, type AthleteRefs } from '@/components/planning/mobile/editorial'
import { totalMin, totalDistance, type MBlock } from '@/components/planning/mobile/blocks'
import { defaultCircuit, type ExerciseItem, type ExoCircuit } from '@/components/planning/mobile/strength'
import type { ComposedMove, ComposedCircuit } from '@/components/planning/composedSports'
import type { SportType, RunningSub } from '@/app/planning/page'
import { buildTreadmillPlan } from './treadmill/treadmillPlan'
import { buildTreadmillStreams, summarizeIntervals, type TreadInterval } from './treadmill/treadmillProfile'

interface Props { onClose: () => void; onSaved?: () => void }

type Mode = 'endurance' | 'muscu' | 'hyrox' | 'boxe' | 'simple'
interface SportDef {
  id: string; label: string; sportType: string; mode: Mode
  builderSport?: SportType   // sport passé au builder planning (trail→run…)
  deniv?: boolean            // champ dénivelé disponible
}
const SPORTS: SportDef[] = [
  { id: 'running',  label: 'Course à pied', sportType: 'running',   mode: 'endurance', builderSport: 'run',        deniv: true },
  { id: 'cycling',  label: 'Vélo',          sportType: 'cycling',    mode: 'endurance', builderSport: 'bike',       deniv: true },
  { id: 'swimming', label: 'Natation',      sportType: 'swimming',   mode: 'endurance', builderSport: 'swim' },
  { id: 'gym',      label: 'Musculation',   sportType: 'gym',        mode: 'muscu' },
  { id: 'hyrox',    label: 'Hyrox',         sportType: 'hyrox',      mode: 'hyrox' },
  { id: 'boxe',     label: 'Boxe',          sportType: 'boxe',       mode: 'boxe' },
  { id: 'rowing',   label: 'Aviron',        sportType: 'rowing',     mode: 'endurance', builderSport: 'rowing' },
  { id: 'elliptique', label: 'Elliptique',  sportType: 'elliptique', mode: 'endurance', builderSport: 'elliptique' },
  { id: 'trail',    label: 'Trail',         sportType: 'trail',      mode: 'endurance', builderSport: 'run',        deniv: true },
  { id: 'hiking',   label: 'Randonnée',     sportType: 'hiking',     mode: 'simple',    deniv: true },
  { id: 'ski',      label: 'Ski',           sportType: 'ski',        mode: 'simple',    deniv: true },
  { id: 'yoga',     label: 'Yoga',          sportType: 'yoga',       mode: 'simple' },
  { id: 'padel',    label: 'Padel',         sportType: 'padel',      mode: 'simple' },
  { id: 'other',    label: 'Autre',         sportType: 'other',      mode: 'simple' },
]

const FB = 'var(--font-body)'
const FD = 'var(--font-display)'
const input: React.CSSProperties = {
  width: '100%', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 10,
  padding: '9px 11px', fontSize: 14, color: 'var(--text)', fontFamily: FB, boxSizing: 'border-box', outline: 'none',
}
const lab: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
  color: 'var(--text-mid)', marginBottom: 6, display: 'block',
}
const NO_REFS: AthleteRefs = { ftp: null, runThresholdPaceSec: null, cssSecPer100m: null }
const intv = (v: string) => { const n = parseInt(v); return isFinite(n) ? n : 0 }
const flt = (v: string) => { const n = parseFloat(v.replace(',', '.')); return isFinite(n) ? n : 0 }
function todayLocalISO(): string {
  const d = new Date(); const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16)
}

export default function ManualEntrySheet({ onClose, onSaved }: Props) {
  const [closing, setClosing] = useState(false)
  const [step, setStep] = useState<'sport' | 'form'>('sport')
  const [def, setDef] = useState<SportDef | null>(null)
  const [runSurface, setRunSurface] = useState<RunningSub>('outdoor')

  // Communs
  const [title, setTitle] = useState('')
  const [when, setWhen] = useState(todayLocalISO)
  const [rpe, setRpe] = useState('')
  const [desc, setDesc] = useState('')
  const [deniv, setDeniv] = useState('')
  const [avgHr, setAvgHr] = useState('')
  // Durée / distance manuelles (muscu/hyrox/boxe/simple)
  const [h, setH] = useState('0'); const [m, setM] = useState('45'); const [s, setS] = useState('0')
  const [distKm, setDistKm] = useState('')

  // État des builders planning
  const [blocks, setBlocks] = useState<MBlock[]>([])
  const [exercises, setExercises] = useState<ExerciseItem[]>([])
  const [circuits, setCircuits] = useState<ExoCircuit[]>([])
  const [exoMap, setExoMap] = useState<Record<string, string>>({})
  const [moves, setMoves] = useState<ComposedMove[]>([])
  const [composedCircuit, setComposedCircuit] = useState<ComposedCircuit>({ rounds: 1, restSec: 0 })
  const [builderTab, setBuilderTab] = useState<'manual' | 'ai'>('manual')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mode = def?.mode ?? 'simple'
  const isTreadmill = def?.id === 'running' && runSurface === 'treadmill'
  const builderSport = def?.builderSport ?? 'run'
  const accent = sportColor(builderSport)
  const durationSecManual = intv(h) * 3600 + intv(m) * 60 + intv(s)

  function doClose() { setClosing(true); setTimeout(onClose, 260) }
  function pickSport(sp: SportDef) {
    setDef(sp); setStep('form')
    setBlocks([]); setExercises([]); setExoMap({}); setMoves([]); setComposedCircuit({ rounds: 1, restSec: 0 })
    setCircuits(sp.mode === 'muscu' || sp.mode === 'hyrox' ? [defaultCircuit(sp.mode === 'muscu' ? 'gym' : 'hyrox')] : [])
    if (sp.id === 'running') setRunSurface('outdoor')
  }

  async function handleSave() {
    if (!def) return
    setError(null); setSaving(true)
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { setError('Session expirée.'); setSaving(false); return }
      const startedAt = new Date(when).toISOString()
      const autoTitle = title.trim() || `${def.label}${isTreadmill ? ' (tapis)' : ''}`
      const rpeN = rpe ? intv(rpe) : null
      const commentN = desc.trim() || null
      const hrN = avgHr ? intv(avgHr) : null
      const denivN = deniv ? intv(deniv) : 0

      const act: Record<string, unknown> = { user_id: user.id, sport_type: def.sportType, title: autoTitle, started_at: startedAt, provider: 'manual' }
      const ws: Record<string, unknown> = { user_id: user.id, sport: def.sportType, started_at: startedAt, ended_at: startedAt, status: 'completed', title: autoTitle, rpe: rpeN, comment: commentN }

      if (isTreadmill) {
        const plan = buildTreadmillPlan(blocks as never, autoTitle)
        if (!plan) { setError('Ajoute au moins un bloc.'); setSaving(false); return }
        const intervals: TreadInterval[] = plan.steps.map(st => ({
          durationS: st.durationS,
          speedKmh: st.targetKmh ?? (st.targetPaceSecPerKm ? 3600 / st.targetPaceSecPerKm : 0),
          inclinePct: st.inclinePct,
        }))
        const sum = summarizeIntervals(intervals)
        const streams = buildTreadmillStreams(intervals)
        Object.assign(act, {
          moving_time_s: sum.durationS, elapsed_time_s: sum.durationS, distance_m: sum.distanceM,
          elevation_gain_m: sum.elevationM, avg_speed_ms: sum.avgSpeedMs, average_heartrate: sum.avgHr,
          training_types: ['tapis'], streams,
        })
        Object.assign(ws, { duration_seconds: sum.durationS, distance_m: sum.distanceM, elevation_gain_m: sum.elevationM, avg_speed_kmh: sum.avgSpeedMs * 3.6, avg_hr: sum.avgHr, training_types: ['tapis'], laps: blocks })
      } else if (mode === 'endurance') {
        const durS = Math.round(totalMin(blocks) * 60) || durationSecManual
        if (durS <= 0) { setError('Ajoute au moins un bloc (ou une durée).'); setSaving(false); return }
        const distM = Math.round(totalDistance(blocks)) || (distKm ? Math.round(flt(distKm) * 1000) : 0)
        Object.assign(act, {
          moving_time_s: durS, elapsed_time_s: durS, distance_m: distM,
          elevation_gain_m: denivN, avg_speed_ms: durS > 0 && distM > 0 ? distM / durS : 0,
          average_heartrate: hrN, laps: blocks.length ? blocks : undefined,
        })
        Object.assign(ws, { duration_seconds: durS, distance_m: distM, elevation_gain_m: denivN, avg_hr: hrN, laps: blocks.length ? blocks : undefined })
      } else if (mode === 'muscu' || mode === 'hyrox') {
        Object.assign(act, { moving_time_s: durationSecManual, elapsed_time_s: durationSecManual, average_heartrate: hrN })
        Object.assign(ws, { duration_seconds: durationSecManual, avg_hr: hrN, exercises_detail: exercises, sets_completed: exercises.length })
      } else if (mode === 'boxe') {
        Object.assign(act, { moving_time_s: durationSecManual, elapsed_time_s: durationSecManual, average_heartrate: hrN })
        Object.assign(ws, { duration_seconds: durationSecManual, avg_hr: hrN, laps: moves })
      } else {
        const distM = distKm ? Math.round(flt(distKm) * 1000) : 0
        Object.assign(act, {
          moving_time_s: durationSecManual, elapsed_time_s: durationSecManual, distance_m: distM,
          elevation_gain_m: denivN, avg_speed_ms: durationSecManual > 0 && distM > 0 ? distM / durationSecManual : 0,
          average_heartrate: hrN,
        })
        Object.assign(ws, { duration_seconds: durationSecManual, distance_m: distM, elevation_gain_m: denivN, avg_hr: hrN })
      }

      await sb.from('activities').insert(act)
      await sb.from('workout_sessions').insert(ws)
      onSaved?.(); doClose()
    } catch (e) {
      console.error('[manual] save error:', e)
      setError("Échec de l'enregistrement. Réessaie."); setSaving(false)
    }
  }

  function renderBuilder() {
    if (mode === 'endurance') return (
      <SessionBlockBuilder
        sport={builderSport} runningSub={def?.id === 'running' ? runSurface : undefined}
        accent={accent} blocks={blocks} onChange={setBlocks}
        sm={0} sn={0} refs={NO_REFS} builderTab={builderTab} onBuilderTab={setBuilderTab} />
    )
    if (mode === 'muscu') return (
      <StrengthBuilder accent={accent} exercises={exercises} setExercises={setExercises}
        circuits={circuits} setCircuits={setCircuits} map={exoMap} setMap={setExoMap}
        sn={0} builderTab={builderTab} onBuilderTab={setBuilderTab} />
    )
    if (mode === 'hyrox') return (
      <HyroxBuilder accent={accent} exercises={exercises} setExercises={setExercises}
        circuits={circuits} setCircuits={setCircuits} map={exoMap} setMap={setExoMap}
        sm={0} sn={0} builderTab={builderTab} onBuilderTab={setBuilderTab} />
    )
    if (mode === 'boxe') return (
      <ComposedBuilder sport="boxe" moves={moves} accent={accent} onChange={setMoves}
        circuit={composedCircuit} onCircuitChange={setComposedCircuit} />
    )
    // simple : durée + distance
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {(def?.deniv || def?.sportType === 'other') && (
          <div>
            <label style={lab}>Distance (km)</label>
            <input type="number" inputMode="decimal" value={distKm} onChange={e => setDistKm(e.target.value)} placeholder="0" style={input} />
          </div>
        )}
      </div>
    )
  }

  const showManualDuration = mode === 'muscu' || mode === 'hyrox' || mode === 'boxe' || mode === 'simple'

  const sheet = (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10060, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div onClick={doClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', animation: closing ? 'me-fade-out 0.24s ease forwards' : 'me-fade-in 0.24s ease' }} />
      <div style={{
        position: 'relative', width: '100%', maxWidth: 560, margin: '0 auto', maxHeight: '94vh',
        display: 'flex', flexDirection: 'column', background: 'var(--bg)', color: 'var(--text)', fontFamily: FB,
        borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden',
        animation: closing ? 'me-slide-down 0.26s cubic-bezier(0.4,0,1,1) forwards' : 'me-slide-up 0.30s cubic-bezier(0.16,1,0.3,1)',
      }}>
        <style>{`
          @keyframes me-fade-in{from{opacity:0}to{opacity:1}} @keyframes me-fade-out{from{opacity:1}to{opacity:0}}
          @keyframes me-slide-up{from{transform:translateY(100%)}to{transform:translateY(0)}}
          @keyframes me-slide-down{from{transform:translateY(0)}to{transform:translateY(100%)}}
        `}</style>
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, flexShrink: 0 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border-mid)' }} />
        </div>

        {step === 'sport' ? (
          <>
            <div style={{ padding: '10px 20px 6px', flexShrink: 0 }}>
              <h2 style={{ fontFamily: FD, fontSize: 22, fontWeight: 600, margin: 0 }}>Créer une activité</h2>
              <p style={{ fontSize: 13, color: 'var(--text-mid)', margin: '4px 0 0' }}>Choisis un sport</p>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px 16px calc(env(safe-area-inset-bottom) + 16px)', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {SPORTS.map(sp => (
                <button key={sp.id} onClick={() => pickSport(sp)}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '16px 8px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, cursor: 'pointer', color: 'var(--text)', fontFamily: FB }}>
                  <SportIcon sport={sp.builderSport ?? sp.sportType} size={30} circle={false} />
                  <span style={{ fontSize: 12, fontWeight: 600, textAlign: 'center' }}>{sp.label}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px 6px', flexShrink: 0 }}>
              <button onClick={() => setStep('sport')} aria-label="Retour" style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--bg-card2)', border: 'none', color: 'var(--text)', fontSize: 19, cursor: 'pointer', flexShrink: 0 }}>‹</button>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <SportIcon sport={builderSport} size={22} circle={false} />
                <h2 style={{ fontFamily: FD, fontSize: 20, fontWeight: 600, margin: 0 }}>{def?.label}</h2>
              </span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '6px 16px 12px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {def?.id === 'running' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['outdoor', 'treadmill'] as RunningSub[]).map(sfc => (
                    <button key={sfc} onClick={() => setRunSurface(sfc)} style={{ flex: 1, padding: '10px', borderRadius: 12, border: `1px solid ${runSurface === sfc ? accent : 'var(--border)'}`, background: runSurface === sfc ? accent : 'var(--bg-card2)', color: runSurface === sfc ? '#fff' : 'var(--text)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: FB }}>
                      {sfc === 'outdoor' ? 'Dehors' : 'Tapis'}
                    </button>
                  ))}
                </div>
              )}

              <div style={{ padding: '0 2px' }}><label style={lab}>Titre</label><input value={title} onChange={e => setTitle(e.target.value)} placeholder="Optionnel" style={input} /></div>
              <div style={{ padding: '0 2px' }}><label style={lab}>Date & heure</label><input type="datetime-local" value={when} onChange={e => setWhen(e.target.value)} style={input} /></div>

              {showManualDuration && (
                <div style={{ padding: '0 2px' }}>
                  <label style={lab}>Durée</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {([['h', h, setH], ['min', m, setM], ['s', s, setS]] as const).map(([u, v, set]) => (
                      <div key={u} style={{ flex: 1, position: 'relative' }}>
                        <input type="number" inputMode="numeric" value={v} onChange={e => set(e.target.value)} style={{ ...input, textAlign: 'center', paddingRight: 28 }} />
                        <span style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--text-mid)', pointerEvents: 'none' }}>{u}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Détail structuré = builder planning (ou simple) */}
              {renderBuilder()}

              {/* Dénivelé (course/vélo/trail/rando) — masqué sur tapis (auto depuis pentes) */}
              {def?.deniv && !isTreadmill && (
                <div style={{ padding: '0 2px' }}>
                  <label style={lab}>Dénivelé + (m)</label>
                  <input type="number" inputMode="numeric" value={deniv} onChange={e => setDeniv(e.target.value)} placeholder="0" style={input} />
                </div>
              )}

              {!isTreadmill && (
                <div style={{ padding: '0 2px' }}><label style={lab}>FC moyenne (bpm)</label><input type="number" inputMode="numeric" value={avgHr} onChange={e => setAvgHr(e.target.value)} placeholder="—" style={input} /></div>
              )}
              <div style={{ padding: '0 2px' }}><label style={lab}>RPE /10</label><input type="number" inputMode="numeric" value={rpe} onChange={e => setRpe(e.target.value)} placeholder="—" style={input} /></div>
              <div style={{ padding: '0 2px' }}><label style={lab}>Description</label><textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} placeholder="Ce que tu as ressenti, le contexte…" style={{ ...input, resize: 'vertical' }} /></div>

              {error && <div style={{ fontSize: 13, color: 'var(--zone-5, #ef4444)', fontWeight: 600, padding: '0 2px' }}>{error}</div>}
            </div>
            <div style={{ padding: '10px 16px calc(env(safe-area-inset-bottom) + 14px)', flexShrink: 0, borderTop: '1px solid var(--border)' }}>
              <button onClick={handleSave} disabled={saving} style={{ width: '100%', height: 52, borderRadius: 14, background: 'var(--primary)', color: 'var(--on-primary)', border: 'none', fontSize: 16, fontWeight: 800, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: FB }}>
                {saving ? 'Enregistrement…' : "Enregistrer l'activité"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
  return createPortal(sheet, document.body)
}
