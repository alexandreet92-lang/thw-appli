'use client'
// Feuille « Ajouter une course » Hyrox (createPortal, DS neutre). Format segmented,
// 8 stations, 8 runs → run compromised auto, roxzone, total auto. Bouton var(--primary).
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Segmented } from '@/components/ui/Segmented'
import { HYROX_STATIONS, HYROX_FORMAT_LABELS, toSec, mmss, hmsTotal, insertRace, type HyroxFormat, type HyroxRace } from './hyroxShared'

const HYROX_DOT = '#ec4899' // design-allow-color — teinte sport hyrox sanctionnée
const SCRIM = 'rgba(0,0,0,0.72)' // design-allow-color — voile de feuille

const fieldLbl: React.CSSProperties = { fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', margin: '0 0 5px' }
const inp: React.CSSProperties = { width: '100%', padding: '9px 11px', borderRadius: 10, border: '1px solid var(--border-mid)', background: 'var(--input-bg)', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }
const sec: React.CSSProperties = { background: 'var(--bg-card2)', borderRadius: 14, padding: '14px 16px', marginBottom: 12 }
const secLbl: React.CSSProperties = { fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', margin: '0 0 12px' }

export function HyroxRaceSheet({ onClose, onSaved }: { onClose: () => void; onSaved: (r: HyroxRace) => void }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [format, setFormat] = useState<HyroxFormat>('solo_open')
  const [partenaire, setPartenaire] = useState('')
  const [stations, setStations] = useState<Record<string, string>>(() => Object.fromEntries(HYROX_STATIONS.map(s => [s, ''])))
  const [runs, setRuns] = useState<string[]>(() => Array(8).fill('') as string[])
  const [roxzone, setRoxzone] = useState('')
  const [saving, setSaving] = useState(false)
  const [closing, setClosing] = useState(false)
  const close = () => { setClosing(true); setTimeout(onClose, 240) }

  const runSec = runs.reduce((a, r) => a + toSec(r), 0)
  const stationSec = HYROX_STATIONS.reduce((a, s) => a + toSec(stations[s] ?? ''), 0)
  const totalSec = stationSec + runSec + toSec(roxzone)
  const totalStr = hmsTotal(totalSec)
  const canSave = totalSec > 0

  async function save() {
    setSaving(true)
    const r = await insertRace({
      date, format, partenaire: partenaire || null,
      temps_final: totalStr || '0:00', temps_run_total: runSec > 0 ? mmss(runSec) : null,
      stations, runs: runs.filter(x => x !== ''),
    })
    setSaving(false)
    if (r) { onSaved(r); close() }
  }

  return createPortal(
    <div onClick={close} className="rec-drawer" style={{ position: 'fixed', inset: 0, zIndex: 3000, background: SCRIM, display: 'flex', alignItems: 'flex-end' }}>
      <div onClick={e => e.stopPropagation()} className={closing ? 'sheet-close' : 'sheet-open'} style={{ width: '100%', maxHeight: '92vh', background: 'var(--bg-card)', borderRadius: '20px 20px 0 0', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden', willChange: 'transform' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0, gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-mid)' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: HYROX_DOT }} />Hyrox
            </span>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Ajouter une course</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="rec-drawer" style={{ padding: '5px 9px', borderRadius: 8, border: '1px solid var(--border-mid)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 11, outline: 'none' }} />
            <button onClick={close} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 16 }}>×</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 100px' }}>
          {/* Format */}
          <div style={sec}>
            <p style={secLbl}>Format</p>
            <Segmented size="sm" ariaLabel="Format" value={format} onChange={setFormat}
              options={(Object.keys(HYROX_FORMAT_LABELS) as HyroxFormat[]).map(f => ({ id: f, label: HYROX_FORMAT_LABELS[f] }))} />
            {(format === 'duo_open' || format === 'duo_pro') && (
              <div style={{ marginTop: 12 }}><p style={fieldLbl}>Partenaire</p><input className="rec-drawer" value={partenaire} onChange={e => setPartenaire(e.target.value)} placeholder="Prénom Nom" style={inp} /></div>
            )}
          </div>

          {/* Stations */}
          <div style={sec}>
            <p style={secLbl}>Stations (temps)</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {HYROX_STATIONS.map((s, i) => (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="tnum" style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', width: 16, flexShrink: 0 }}>{i + 1}</span>
                  <span style={{ flex: 1, fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-mid)' }}>{s}</span>
                  <input className="rec-drawer" value={stations[s]} onChange={e => setStations(p => ({ ...p, [s]: e.target.value }))} placeholder="mm:ss" style={{ ...inp, width: 84, textAlign: 'right' }} />
                </div>
              ))}
            </div>
          </div>

          {/* Runs */}
          <div style={sec}>
            <p style={secLbl}>Runs — 8 × 1 km (compromised)</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i}>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: 9, color: 'var(--text-dim)', margin: '0 0 4px', textAlign: 'center' }}>Run {i + 1}</p>
                  <input className="rec-drawer" value={runs[i]} onChange={e => setRuns(p => { const n = [...p]; n[i] = e.target.value; return n })} placeholder="mm:ss" style={{ ...inp, padding: 6, textAlign: 'center' }} />
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 'var(--r-sm)', background: 'var(--bg-elev)' }}>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-dim)' }}>Run compromised (auto) </span>
              <span className="tnum" style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{runSec > 0 ? mmss(runSec) : '—'}</span>
            </div>
          </div>

          {/* Roxzone */}
          <div style={sec}>
            <p style={secLbl}>Roxzone</p>
            <input className="rec-drawer" value={roxzone} onChange={e => setRoxzone(e.target.value)} placeholder="mm:ss" style={{ ...inp, maxWidth: 160 }} />
          </div>

          {/* Total auto */}
          <div style={{ ...sec, marginBottom: 0 }}>
            <p style={secLbl}>Temps total (auto)</p>
            <span className="tnum" style={{ fontFamily: 'var(--font-body)', fontSize: 22, fontWeight: 600, color: totalSec > 0 ? 'var(--text)' : 'var(--text-dim)' }}>{totalStr || '—'}</span>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-dim)', marginLeft: 8 }}>stations + runs + roxzone</span>
          </div>
        </div>

        {/* Save */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 20px 20px', background: 'var(--bg-card)', borderTop: '1px solid var(--border)' }}>
          <button onClick={() => void save()} disabled={!canSave || saving}
            style={{ width: '100%', padding: '14px', borderRadius: 'var(--r-sm)', border: 'none', cursor: canSave && !saving ? 'pointer' : 'not-allowed', background: canSave && !saving ? 'var(--primary)' : 'var(--bg-card2)', color: canSave && !saving ? 'var(--on-primary)' : 'var(--text-dim)', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600 }}>
            {saving ? 'Enregistrement…' : 'Enregistrer la course'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
