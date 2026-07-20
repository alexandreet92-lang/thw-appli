'use client'
// Saisie MANUELLE d'une activité (tous sports). Sur-page coulissante du bas vers
// le haut. Étape 1 : choix du sport. Étape 2 : champs communs (titre, RPE,
// description) + détail STRUCTURÉ propre au sport (ce qu'on a fait précisément).
//
// - Vélo : durée, km, km/h auto, watts moyens, + blocs (fractionné).
// - Course DEHORS : durée, km, km/h auto, + blocs.
// - Course TAPIS : intervalles (durée + vitesse km/h + pente %) → profil
//   altimétrique généré (montée monotone), vitesse, vitesse équivalente plat.
// - Natation : distance (m) + séries.
// - Muscu : exercices (séries × reps × charge).
// - Boxe : rounds + exercices (temps de travail / récup).
// - Autres : durée (+ distance) simple.
//
// Écrit dans `activities` (feed/analytics, avec streams pour le tapis) et
// `workout_sessions` (journal). Aucune donnée fabriquée : seuls les champs saisis
// sont enregistrés ; ceux laissés vides ne sont pas affichés sur la fiche.
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { buildTreadmillStreams, summarizeIntervals, type TreadInterval } from './treadmill/treadmillProfile'

interface Props { onClose: () => void; onSaved?: () => void }

type Kind = 'bike' | 'run' | 'swim' | 'muscu' | 'boxe' | 'simple'

interface SportDef { id: string; label: string; emoji: string; kind: Kind; sportType: string }
const SPORTS: SportDef[] = [
  { id: 'running',  label: 'Course à pied', emoji: '🏃', kind: 'run',   sportType: 'running' },
  { id: 'cycling',  label: 'Vélo',          emoji: '🚴', kind: 'bike',  sportType: 'cycling' },
  { id: 'swimming', label: 'Natation',      emoji: '🏊', kind: 'swim',  sportType: 'swimming' },
  { id: 'gym',      label: 'Musculation',   emoji: '🏋️', kind: 'muscu', sportType: 'gym' },
  { id: 'hyrox',    label: 'Hyrox',         emoji: '🔥', kind: 'muscu', sportType: 'hyrox' },
  { id: 'boxe',     label: 'Boxe',          emoji: '🥊', kind: 'boxe',  sportType: 'boxe' },
  { id: 'rowing',   label: 'Aviron',        emoji: '🚣', kind: 'simple', sportType: 'rowing' },
  { id: 'hiking',   label: 'Randonnée',     emoji: '🥾', kind: 'simple', sportType: 'hiking' },
  { id: 'trail',    label: 'Trail',         emoji: '⛰️', kind: 'run',   sportType: 'trail' },
  { id: 'ski',      label: 'Ski',           emoji: '🎿', kind: 'simple', sportType: 'ski' },
  { id: 'yoga',     label: 'Yoga',          emoji: '🧘', kind: 'simple', sportType: 'yoga' },
  { id: 'padel',    label: 'Padel',         emoji: '🎾', kind: 'simple', sportType: 'padel' },
  { id: 'elliptique', label: 'Elliptique',  emoji: '🌀', kind: 'simple', sportType: 'elliptique' },
  { id: 'other',    label: 'Autre',         emoji: '⚡', kind: 'simple', sportType: 'other' },
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
const card: React.CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 12, marginBottom: 10 }
const smallBtn: React.CSSProperties = {
  padding: '8px 14px', borderRadius: 10, background: 'var(--bg-card2)', border: '1px solid var(--border)',
  color: 'var(--text)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: FB,
}

function num(v: string): number { const n = parseFloat(v.replace(',', '.')); return isFinite(n) ? n : 0 }
function intv(v: string): number { const n = parseInt(v); return isFinite(n) ? n : 0 }
function todayLocalISO(): string {
  const d = new Date(); const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16)
}

// ── Types d'entrée structurée ──────────────────────────────────
interface Blk { id: string; label: string; min: string; target: string }   // vélo/course dehors
interface TIv { id: string; min: string; sec: string; kmh: string; incline: string; hr: string }  // tapis
interface Exo { id: string; name: string; sets: string; reps: string; kg: string }   // muscu
interface Rnd { id: string; name: string; workS: string; restS: string }             // boxe
interface Swm { id: string; reps: string; distM: string; pace: string; stroke: string } // natation

const uid = () => `r_${Math.random().toString(36).slice(2, 8)}`

export default function ManualEntrySheet({ onClose, onSaved }: Props) {
  const [closing, setClosing] = useState(false)
  const [step, setStep] = useState<'sport' | 'form'>('sport')
  const [def, setDef] = useState<SportDef | null>(null)
  const [runSurface, setRunSurface] = useState<'outdoor' | 'treadmill'>('outdoor')

  // Communs
  const [title, setTitle] = useState('')
  const [when, setWhen] = useState(todayLocalISO)
  const [rpe, setRpe] = useState('')
  const [desc, setDesc] = useState('')
  // Durée / distance globales
  const [h, setH] = useState('0'); const [m, setM] = useState('45'); const [s, setS] = useState('0')
  const [distKm, setDistKm] = useState('')
  const [distM, setDistMeters] = useState('')   // natation en mètres
  const [watts, setWatts] = useState('')
  const [avgHr, setAvgHr] = useState('')
  // Détail structuré
  const [blocks, setBlocks] = useState<Blk[]>([])
  const [tivs, setTivs] = useState<TIv[]>([{ id: uid(), min: '5', sec: '0', kmh: '10', incline: '0', hr: '' }])
  const [exos, setExos] = useState<Exo[]>([{ id: uid(), name: '', sets: '4', reps: '10', kg: '' }])
  const [rounds, setRounds] = useState<Rnd[]>([{ id: uid(), name: '', workS: '180', restS: '60' }])
  const [swims, setSwims] = useState<Swm[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const kind = def?.kind ?? 'simple'
  const isTreadmill = kind === 'run' && runSurface === 'treadmill' && def?.id === 'running'

  function doClose() { setClosing(true); setTimeout(onClose, 260) }

  const durationSecManual = intv(h) * 3600 + intv(m) * 60 + intv(s)
  const treadTotalSec = tivs.reduce((a, iv) => a + intv(iv.min) * 60 + intv(iv.sec), 0)

  async function handleSave() {
    if (!def) return
    setError(null)
    setSaving(true)
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { setError('Session expirée.'); setSaving(false); return }
      const startedAt = new Date(when).toISOString()
      const autoTitle = title.trim() || `${def.label}${isTreadmill ? ' (tapis)' : ''}`
      const rpeN = rpe ? intv(rpe) : null
      const commentN = desc.trim() || null

      // Payloads de base
      const act: Record<string, unknown> = {
        user_id: user.id, sport_type: def.sportType, title: autoTitle,
        started_at: startedAt, provider: 'manual',
      }
      const ws: Record<string, unknown> = {
        user_id: user.id, sport: def.sportType, started_at: startedAt, ended_at: startedAt,
        status: 'completed', title: autoTitle, rpe: rpeN, comment: commentN,
        training_types: isTreadmill ? ['tapis'] : undefined,
      }

      if (isTreadmill) {
        // Intervalles tapis → profil altimétrique + agrégats
        const intervals: TreadInterval[] = tivs.map(iv => ({
          durationS: intv(iv.min) * 60 + intv(iv.sec),
          speedKmh: num(iv.kmh), inclinePct: num(iv.incline),
          hr: iv.hr ? intv(iv.hr) : null,
        }))
        const sum = summarizeIntervals(intervals)
        const streams = buildTreadmillStreams(intervals)
        Object.assign(act, {
          moving_time_s: sum.durationS, elapsed_time_s: sum.durationS,
          distance_m: sum.distanceM, elevation_gain_m: sum.elevationM,
          avg_speed_ms: sum.avgSpeedMs, average_heartrate: sum.avgHr, streams,
        })
        Object.assign(ws, {
          duration_seconds: sum.durationS, distance_m: sum.distanceM,
          elevation_gain_m: sum.elevationM, avg_speed_kmh: sum.avgSpeedMs * 3.6, avg_hr: sum.avgHr,
        })
      } else if (kind === 'muscu') {
        const detail = exos.filter(e => e.name.trim()).map(e => ({
          name: e.name.trim(), sets: intv(e.sets), reps: intv(e.reps), weightKg: num(e.kg),
        }))
        Object.assign(act, { moving_time_s: durationSecManual, elapsed_time_s: durationSecManual, average_heartrate: avgHr ? intv(avgHr) : null })
        Object.assign(ws, { duration_seconds: durationSecManual, exercises_detail: detail, avg_hr: avgHr ? intv(avgHr) : null })
      } else if (kind === 'boxe') {
        const detail = rounds.filter(r => r.name.trim() || r.workS).map(r => ({
          name: r.name.trim() || 'Round', workSec: intv(r.workS), restSec: intv(r.restS),
        }))
        Object.assign(act, { moving_time_s: durationSecManual, elapsed_time_s: durationSecManual, average_heartrate: avgHr ? intv(avgHr) : null })
        Object.assign(ws, { duration_seconds: durationSecManual, laps: detail, avg_hr: avgHr ? intv(avgHr) : null })
      } else if (kind === 'swim') {
        const dM = intv(distM)
        const detail = swims.filter(sw => intv(sw.distM) > 0).map(sw => ({
          reps: intv(sw.reps) || 1, distance_m: intv(sw.distM), pace: sw.pace.trim(), stroke: sw.stroke.trim(),
        }))
        Object.assign(act, {
          moving_time_s: durationSecManual, elapsed_time_s: durationSecManual, distance_m: dM,
          avg_speed_ms: durationSecManual > 0 && dM > 0 ? dM / durationSecManual : 0,
          average_heartrate: avgHr ? intv(avgHr) : null,
        })
        Object.assign(ws, { duration_seconds: durationSecManual, distance_m: dM, swim_intervals: detail, avg_hr: avgHr ? intv(avgHr) : null })
      } else {
        // Vélo / course dehors / simple : durée + distance (+ watts) + blocs éventuels
        const dM = distKm ? Math.round(num(distKm) * 1000) : 0
        const wattsN = watts ? intv(watts) : null
        const detail = blocks.filter(b => intv(b.min) > 0).map(b => ({
          label: b.label.trim() || 'Bloc', moving_time_s: intv(b.min) * 60, target: b.target.trim(),
        }))
        Object.assign(act, {
          moving_time_s: durationSecManual, elapsed_time_s: durationSecManual, distance_m: dM,
          avg_speed_ms: durationSecManual > 0 && dM > 0 ? dM / durationSecManual : 0,
          avg_watts: wattsN, average_heartrate: avgHr ? intv(avgHr) : null,
          laps: detail.length ? detail : undefined,
        })
        Object.assign(ws, {
          duration_seconds: durationSecManual, distance_m: dM, avg_watts: wattsN,
          avg_hr: avgHr ? intv(avgHr) : null, laps: detail.length ? detail : undefined,
        })
      }

      await sb.from('activities').insert(act)
      await sb.from('workout_sessions').insert(ws)
      onSaved?.()
      doClose()
    } catch (e) {
      console.error('[manual] save error:', e)
      setError("Échec de l'enregistrement. Réessaie.")
      setSaving(false)
    }
  }

  // ── UI helpers ──
  const DurationRow = () => (
    <div>
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
  )
  const kmhAuto = (() => {
    const dM = num(distKm) * 1000
    return durationSecManual > 0 && dM > 0 ? ((dM / durationSecManual) * 3.6).toFixed(1).replace('.', ',') : null
  })()

  // ── Rendu formulaire par sport ──
  function renderDetail() {
    if (isTreadmill) return (
      <div>
        <label style={lab}>Intervalles (tapis)</label>
        {tivs.map((iv, i) => (
          <div key={iv.id} style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--primary)' }}>Bloc {i + 1}</span>
              {tivs.length > 1 && <button onClick={() => setTivs(a => a.filter(x => x.id !== iv.id))} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 18 }}>×</button>}
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <Field label="Min" v={iv.min} on={v => setTivs(a => a.map(x => x.id === iv.id ? { ...x, min: v } : x))} />
              <Field label="Sec" v={iv.sec} on={v => setTivs(a => a.map(x => x.id === iv.id ? { ...x, sec: v } : x))} />
              <Field label="km/h" v={iv.kmh} on={v => setTivs(a => a.map(x => x.id === iv.id ? { ...x, kmh: v } : x))} />
              <Field label="Pente %" v={iv.incline} on={v => setTivs(a => a.map(x => x.id === iv.id ? { ...x, incline: v } : x))} />
              <Field label="FC" v={iv.hr} on={v => setTivs(a => a.map(x => x.id === iv.id ? { ...x, hr: v } : x))} />
            </div>
          </div>
        ))}
        <button onClick={() => setTivs(a => [...a, { id: uid(), min: '5', sec: '0', kmh: '10', incline: '0', hr: '' }])} style={smallBtn}>+ Ajouter un bloc</button>
        <div style={{ fontSize: 12, color: 'var(--text-mid)', marginTop: 10 }}>
          Durée totale ~{Math.round(treadTotalSec / 60)} min · le profil altimétrique est généré depuis les pentes.
        </div>
      </div>
    )
    if (kind === 'muscu') return (
      <div>
        <label style={lab}>Exercices</label>
        {exos.map((e, i) => (
          <div key={e.id} style={card}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input value={e.name} placeholder={`Exercice ${i + 1}`} onChange={ev => setExos(a => a.map(x => x.id === e.id ? { ...x, name: ev.target.value } : x))} style={{ ...input, flex: 1 }} />
              {exos.length > 1 && <button onClick={() => setExos(a => a.filter(x => x.id !== e.id))} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 18 }}>×</button>}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Field label="Séries" v={e.sets} on={v => setExos(a => a.map(x => x.id === e.id ? { ...x, sets: v } : x))} />
              <Field label="Reps" v={e.reps} on={v => setExos(a => a.map(x => x.id === e.id ? { ...x, reps: v } : x))} />
              <Field label="Charge kg" v={e.kg} on={v => setExos(a => a.map(x => x.id === e.id ? { ...x, kg: v } : x))} />
            </div>
          </div>
        ))}
        <button onClick={() => setExos(a => [...a, { id: uid(), name: '', sets: '4', reps: '10', kg: '' }])} style={smallBtn}>+ Ajouter un exercice</button>
      </div>
    )
    if (kind === 'boxe') return (
      <div>
        <label style={lab}>Rounds / exercices</label>
        {rounds.map((r, i) => (
          <div key={r.id} style={card}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input value={r.name} placeholder={`Round ${i + 1}`} onChange={ev => setRounds(a => a.map(x => x.id === r.id ? { ...x, name: ev.target.value } : x))} style={{ ...input, flex: 1 }} />
              {rounds.length > 1 && <button onClick={() => setRounds(a => a.filter(x => x.id !== r.id))} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 18 }}>×</button>}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Field label="Travail (s)" v={r.workS} on={v => setRounds(a => a.map(x => x.id === r.id ? { ...x, workS: v } : x))} />
              <Field label="Récup (s)" v={r.restS} on={v => setRounds(a => a.map(x => x.id === r.id ? { ...x, restS: v } : x))} />
            </div>
          </div>
        ))}
        <button onClick={() => setRounds(a => [...a, { id: uid(), name: '', workS: '180', restS: '60' }])} style={smallBtn}>+ Ajouter un round</button>
      </div>
    )
    if (kind === 'swim') return (
      <div>
        <label style={lab}>Distance totale</label>
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <input type="number" inputMode="numeric" value={distM} onChange={e => setDistMeters(e.target.value)} placeholder="0" style={{ ...input, paddingRight: 34 }} />
          <span style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--text-mid)' }}>m</span>
        </div>
        <label style={lab}>Séries (optionnel)</label>
        {swims.map((sw, i) => (
          <div key={sw.id} style={card}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setSwims(a => a.filter(x => x.id !== sw.id))} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Field label="Répét." v={sw.reps} on={v => setSwims(a => a.map(x => x.id === sw.id ? { ...x, reps: v } : x))} />
              <Field label="Dist. m" v={sw.distM} on={v => setSwims(a => a.map(x => x.id === sw.id ? { ...x, distM: v } : x))} />
              <Field label="Allure" v={sw.pace} on={v => setSwims(a => a.map(x => x.id === sw.id ? { ...x, pace: v } : x))} text />
            </div>
          </div>
        ))}
        <button onClick={() => setSwims(a => [...a, { id: uid(), reps: '8', distM: '100', pace: '', stroke: 'Crawl' }])} style={smallBtn}>+ Ajouter une série</button>
      </div>
    )
    // Vélo / course dehors / simple
    return (
      <div>
        {(kind === 'bike' || kind === 'run' || def?.sportType === 'rowing' || def?.sportType === 'hiking' || def?.sportType === 'trail' || def?.sportType === 'ski') && (
          <div style={{ marginBottom: 14 }}>
            <label style={lab}>Distance</label>
            <div style={{ position: 'relative' }}>
              <input type="number" inputMode="decimal" value={distKm} onChange={e => setDistKm(e.target.value)} placeholder="0" style={{ ...input, paddingRight: 60 }} />
              <span style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--text-mid)' }}>
                km{kmhAuto ? ` · ${kmhAuto} km/h` : ''}
              </span>
            </div>
          </div>
        )}
        {kind === 'bike' && (
          <div style={{ marginBottom: 14 }}>
            <label style={lab}>Watts moyens</label>
            <input type="number" inputMode="numeric" value={watts} onChange={e => setWatts(e.target.value)} placeholder="—" style={input} />
          </div>
        )}
        {(kind === 'bike' || kind === 'run') && (
          <div>
            <label style={lab}>Blocs / fractionné (optionnel)</label>
            {blocks.map((b, i) => (
              <div key={b.id} style={card}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input value={b.label} placeholder={`Bloc ${i + 1}`} onChange={ev => setBlocks(a => a.map(x => x.id === b.id ? { ...x, label: ev.target.value } : x))} style={{ ...input, flex: 1 }} />
                  <button onClick={() => setBlocks(a => a.filter(x => x.id !== b.id))} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 18 }}>×</button>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Field label="Durée min" v={b.min} on={v => setBlocks(a => a.map(x => x.id === b.id ? { ...x, min: v } : x))} />
                  <Field label={kind === 'bike' ? 'Watts' : 'Allure'} v={b.target} on={v => setBlocks(a => a.map(x => x.id === b.id ? { ...x, target: v } : x))} text />
                </div>
              </div>
            ))}
            <button onClick={() => setBlocks(a => [...a, { id: uid(), label: '', min: '5', target: '' }])} style={smallBtn}>+ Ajouter un bloc</button>
          </div>
        )}
      </div>
    )
  }

  const sheet = (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10060, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div onClick={doClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', animation: closing ? 'me-fade-out 0.24s ease forwards' : 'me-fade-in 0.24s ease' }} />
      <div style={{
        position: 'relative', width: '100%', maxWidth: 560, margin: '0 auto',
        maxHeight: '92vh', display: 'flex', flexDirection: 'column',
        background: 'var(--bg)', color: 'var(--text)', fontFamily: FB,
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
                <button key={sp.id} onClick={() => { setDef(sp); setStep('form'); if (sp.id === 'running') setRunSurface('outdoor') }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '16px 8px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, cursor: 'pointer', color: 'var(--text)', fontFamily: FB }}>
                  <span style={{ fontSize: 26 }}>{sp.emoji}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, textAlign: 'center' }}>{sp.label}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px 6px', flexShrink: 0 }}>
              <button onClick={() => setStep('sport')} aria-label="Retour" style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--bg-card2)', border: 'none', color: 'var(--text)', fontSize: 19, cursor: 'pointer', flexShrink: 0 }}>‹</button>
              <h2 style={{ fontFamily: FD, fontSize: 20, fontWeight: 600, margin: 0 }}>{def?.emoji} {def?.label}</h2>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '6px 18px 12px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {def?.id === 'running' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['outdoor', 'treadmill'] as const).map(sfc => (
                    <button key={sfc} onClick={() => setRunSurface(sfc)} style={{ flex: 1, padding: '10px', borderRadius: 12, border: '1px solid var(--border)', background: runSurface === sfc ? 'var(--primary)' : 'var(--bg-card2)', color: runSurface === sfc ? 'var(--on-primary)' : 'var(--text)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: FB }}>
                      {sfc === 'outdoor' ? 'Dehors' : 'Tapis'}
                    </button>
                  ))}
                </div>
              )}

              <div><label style={lab}>Titre</label><input value={title} onChange={e => setTitle(e.target.value)} placeholder="Optionnel" style={input} /></div>
              <div><label style={lab}>Date & heure</label><input type="datetime-local" value={when} onChange={e => setWhen(e.target.value)} style={input} /></div>

              {!isTreadmill && <DurationRow />}

              {renderDetail()}

              {kind !== 'muscu' && kind !== 'boxe' && !isTreadmill && (
                <div><label style={lab}>FC moyenne (bpm)</label><input type="number" inputMode="numeric" value={avgHr} onChange={e => setAvgHr(e.target.value)} placeholder="—" style={input} /></div>
              )}

              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}><label style={lab}>RPE /10</label><input type="number" inputMode="numeric" value={rpe} onChange={e => setRpe(e.target.value)} placeholder="—" style={input} /></div>
              </div>
              <div><label style={lab}>Description</label><textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} placeholder="Ce que tu as ressenti, le contexte…" style={{ ...input, resize: 'vertical' }} /></div>

              {error && <div style={{ fontSize: 13, color: 'var(--zone-5, #ef4444)', fontWeight: 600 }}>{error}</div>}
            </div>
            <div style={{ padding: '10px 18px calc(env(safe-area-inset-bottom) + 14px)', flexShrink: 0, borderTop: '1px solid var(--border)' }}>
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

// Petit champ numérique labellisé.
function Field({ label, v, on, text }: { label: string; v: string; on: (v: string) => void; text?: boolean }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-mid)', marginBottom: 4 }}>{label}</div>
      <input type={text ? 'text' : 'number'} inputMode={text ? 'text' : 'numeric'} value={v} onChange={e => on(e.target.value)}
        style={{ width: '100%', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 8px', fontSize: 13, color: 'var(--text)', fontFamily: FB, boxSizing: 'border-box', outline: 'none', textAlign: 'center' }} />
    </div>
  )
}
