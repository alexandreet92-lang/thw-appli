'use client'
// Feuille de saisie d'une course Triathlon (DS neutre, createPortal). Un bloc par
// segment (Natation / T1 / Vélo / T2 / Course), autos (vitesse/allure), total recalculé,
// « Lier une activité » par sport (puces de données réelles). Bouton d'action var(--primary).
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { TriSegment, triInp } from './TriSegment'
import { toSec, hmsFull, prefillFromActivity, extraChips, type ActivityLite, type Segment } from './triActivities'

const TRI_DOT = '#8b5cf6' // design-allow-color — teinte sport triathlon sanctionnée
const SWIM_DOT = '#06b6d4' // design-allow-color
const BIKE_DOT = '#3b82f6' // design-allow-color
const RUN_DOT = '#f97316' // design-allow-color
const SCRIM = 'rgba(0,0,0,0.72)' // design-allow-color — voile de feuille (scrim)

const DIST: Record<string, { swimM: number; bikeKm: number; runKm: number }> = {
  XS: { swimM: 400, bikeKm: 10, runKm: 2.5 }, S: { swimM: 750, bikeKm: 20, runKm: 5 },
  M: { swimM: 1500, bikeKm: 40, runKm: 10 }, '70.3': { swimM: 1900, bikeKm: 90, runKm: 21.1 },
  Ironman: { swimM: 3800, bikeKm: 180, runKm: 42.2 },
}

export interface TriathlonDrawerProps {
  fmtId: string; fmtLabel: string; fmtSwim: string; fmtBike: string; fmtRun: string
  draft: string; setDraft: (v: string) => void
  date: string; setDate: (v: string) => void
  swim: string; setSwim: (v: string) => void
  t1: string; setT1: (v: string) => void
  bikeTime: string; setBikeTime: (v: string) => void
  t2: string; setT2: (v: string) => void
  run: string; setRun: (v: string) => void
  profile: { weight: number }
  saving: boolean
  onConfirm: (totalOverride?: string) => Promise<void>
  onClose: () => void
}

type Chips = { label: string; value: string }[]

export function TriathlonDrawer(p: TriathlonDrawerProps) {
  const { fmtId, fmtLabel, fmtSwim, fmtBike, fmtRun, draft, setDraft, date, setDate, swim, setSwim, t1, setT1, bikeTime, setBikeTime, t2, setT2, run, setRun, profile, saving, onConfirm, onClose } = p
  const [mounted, setMounted] = useState(false)
  const [bikeWatts, setBikeWatts] = useState('')
  const [bikeNP, setBikeNP] = useState('')
  const [bikeHr, setBikeHr] = useState('')
  const [runHr, setRunHr] = useState('')
  const [chips, setChips] = useState<Partial<Record<Segment, Chips>>>({})
  const [closing, setClosing] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null

  const close = () => { setClosing(true); setTimeout(onClose, 240) }

  const dist = DIST[fmtId]
  const swimSec = toSec(swim), runSec = toSec(run), bikeS = toSec(bikeTime)
  const swimAuto = dist && swimSec > 0 ? (() => { const s = swimSec / (dist.swimM / 100); return `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')} /100m` })() : null
  const runAuto = dist && runSec > 0 ? (() => { const s = runSec / dist.runKm; return `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')} /km` })() : null
  const bikeAuto = dist && bikeS > 0 ? `${(dist.bikeKm / (bikeS / 3600)).toFixed(1)} km/h` : null
  const watts = parseFloat(bikeWatts) || 0
  const wkg = watts > 0 && profile.weight > 0 ? `${(watts / profile.weight).toFixed(2)} W/kg` : null

  const autoTotal = swimSec + toSec(t1) + bikeS + toSec(t2) + runSec
  const autoTotalStr = autoTotal > 0 ? hmsFull(autoTotal) : ''
  const displayTotal = draft || autoTotalStr
  const canSave = !!(swim || bikeTime || run || draft)

  function link(seg: Segment, a: ActivityLite) {
    const pf = prefillFromActivity(seg, a)
    if (seg === 'swim' && pf.time) setSwim(pf.time)
    if (seg === 'bike') { if (pf.time) setBikeTime(pf.time); if (pf.watts) setBikeWatts(pf.watts); if (pf.np) setBikeNP(pf.np); if (pf.hr) setBikeHr(pf.hr) }
    if (seg === 'run') { if (pf.time) setRun(pf.time); if (pf.hr) setRunHr(pf.hr) }
    setChips(c => ({ ...c, [seg]: extraChips(seg, a) }))
  }

  const subInp = (v: string, set: (x: string) => void, ph: string, t: 'text' | 'number' = 'text') => (
    <input className="rec-drawer" type={t} value={v} onChange={e => set(e.target.value)} placeholder={ph} style={triInp} />
  )
  const fieldLbl: React.CSSProperties = { fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', margin: '12px 0 5px' }

  return createPortal(
    <div onClick={close} className="rec-drawer" style={{ position: 'fixed', inset: 0, zIndex: 3000, background: SCRIM, display: 'flex', alignItems: 'flex-end' }}>
      <div onClick={e => e.stopPropagation()} className={closing ? 'sheet-close' : 'sheet-open'} style={{ width: '100%', maxHeight: '92vh', background: 'var(--bg-card)', borderRadius: '20px 20px 0 0', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden', willChange: 'transform' }}>
        {/* Header neutre */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-mid)' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: TRI_DOT }} />Triathlon
            </span>
            <span style={{ padding: '3px 9px', borderRadius: 8, background: 'var(--bg-card2)', fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600, color: 'var(--text-mid)' }}>{fmtLabel}</span>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Saisir une course</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="rec-drawer" style={{ padding: '5px 9px', borderRadius: 8, border: '1px solid var(--border-mid)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 11, outline: 'none' }} />
            <button onClick={close} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 16 }}>×</button>
          </div>
        </div>

        {/* Corps */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 100px' }}>
          <TriSegment title="Natation" distLabel={fmtSwim} dot={SWIM_DOT} segment="swim" time={swim} setTime={setSwim} auto={swimAuto} onLink={a => link('swim', a)} chips={chips.swim} linked={!!chips.swim} />
          <TriSegment title="T1 — Transition" time={t1} setTime={setT1} timeLabel="Durée (mm:ss)" />
          <TriSegment title="Vélo" distLabel={fmtBike} dot={BIKE_DOT} segment="bike" time={bikeTime} setTime={setBikeTime} timeLabel="Temps (hh:mm:ss)" auto={bikeAuto} onLink={a => link('bike', a)} chips={chips.bike} linked={!!chips.bike}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><p style={fieldLbl}>Watts moyens</p>{subInp(bikeWatts, setBikeWatts, 'ex : 210', 'number')}{wkg && <span className="tnum" style={{ display: 'block', marginTop: 5, fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-mid)' }}>→ {wkg}</span>}</div>
              <div><p style={fieldLbl}>NP (W normalisés)</p>{subInp(bikeNP, setBikeNP, 'ex : 225', 'number')}</div>
            </div>
            <p style={fieldLbl}>FC moyenne (bpm)</p>{subInp(bikeHr, setBikeHr, 'ex : 152', 'number')}
          </TriSegment>
          <TriSegment title="T2 — Transition" time={t2} setTime={setT2} timeLabel="Durée (mm:ss)" />
          <TriSegment title="Course à pied" distLabel={fmtRun} dot={RUN_DOT} segment="run" time={run} setTime={setRun} auto={runAuto} onLink={a => link('run', a)} chips={chips.run} linked={!!chips.run}>
            <p style={fieldLbl}>FC moyenne (bpm)</p>{subInp(runHr, setRunHr, 'ex : 158', 'number')}
          </TriSegment>

          {/* Total */}
          <div style={{ background: 'var(--bg-card2)', borderRadius: 14, padding: '14px 16px' }}>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', margin: '0 0 8px' }}>Temps total</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <input className="rec-drawer tnum" value={displayTotal} onChange={e => setDraft(e.target.value)} placeholder="auto-calculé ou manuel" style={{ ...triInp, maxWidth: 180, fontWeight: 600 }} />
              {autoTotalStr && autoTotalStr !== displayTotal && (
                <button onClick={() => setDraft(autoTotalStr)} style={{ padding: 0, border: 'none', background: 'transparent', color: 'var(--primary)', fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Recalculer ({autoTotalStr})</button>
              )}
            </div>
          </div>
        </div>

        {/* Enregistrer */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 20px 20px', background: 'var(--bg-card)', borderTop: '1px solid var(--border)' }}>
          <button onClick={() => void onConfirm(!draft && autoTotalStr ? autoTotalStr : undefined)} disabled={!canSave || saving}
            style={{ width: '100%', padding: '14px', borderRadius: 'var(--r-sm)', border: 'none', cursor: canSave && !saving ? 'pointer' : 'not-allowed', background: canSave && !saving ? 'var(--primary)' : 'var(--bg-card2)', color: canSave && !saving ? 'var(--on-primary)' : 'var(--text-dim)', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600 }}>
            {saving ? 'Enregistrement…' : 'Enregistrer la course'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
