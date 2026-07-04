'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useI18n } from '@/lib/i18n'

type TFn = (key: string, vars?: Record<string, string | number>) => string

// ── Calcul des zones ──────────────────────────────
function calcRunZones(lthr: number, thresholdPace: number, t: TFn) {
  // thresholdPace en sec/km
  return [
    { zone: 1, label: `Z1 — ${t('misc.zoneRecovery')}`, color: '#9ca3af', paceMin: thresholdPace * 1.25, paceMax: 9999,                hrMin: 0,           hrMax: lthr * 0.80 },
    { zone: 2, label: `Z2 — ${t('misc.zoneAerobic')}`,  color: '#22c55e', paceMin: thresholdPace * 1.10, paceMax: thresholdPace * 1.25, hrMin: lthr * 0.80, hrMax: lthr * 0.89 },
    { zone: 3, label: `Z3 — ${t('misc.zoneTempo')}`,    color: '#eab308', paceMin: thresholdPace * 1.00, paceMax: thresholdPace * 1.10, hrMin: lthr * 0.89, hrMax: lthr * 0.95 },
    { zone: 4, label: `Z4 — ${t('misc.zoneThreshold')}`,color: '#f97316', paceMin: thresholdPace * 0.90, paceMax: thresholdPace * 1.00, hrMin: lthr * 0.95, hrMax: lthr * 1.02 },
    { zone: 5, label: 'Z5 — VO2max',                    color: '#ef4444', paceMin: 0,                    paceMax: thresholdPace * 0.90, hrMin: lthr * 1.02, hrMax: 220 },
  ]
}

function calcBikeZones(ftp: number, t: TFn) {
  return [
    { zone: 1, label: `Z1 — ${t('misc.zoneRecovery')}`,  color: '#9ca3af', wMin: 0,          wMax: ftp * 0.55 },
    { zone: 2, label: `Z2 — ${t('misc.zoneEndurance')}`, color: '#22c55e', wMin: ftp * 0.55, wMax: ftp * 0.75 },
    { zone: 3, label: `Z3 — ${t('misc.zoneTempo')}`,     color: '#eab308', wMin: ftp * 0.75, wMax: ftp * 0.87 },
    { zone: 4, label: `Z4 — ${t('misc.zoneThreshold')}`, color: '#f97316', wMin: ftp * 0.87, wMax: ftp * 1.05 },
    { zone: 5, label: 'Z5 — VO2max',                     color: '#ef4444', wMin: ftp * 1.05, wMax: 9999 },
  ]
}

function calcSwimZones(css: number, t: TFn) {
  // css en sec/100m
  return [
    { zone: 1, label: `Z1 — ${t('misc.zoneRecovery')}`, color: '#9ca3af', paceMin: css * 1.30, paceMax: 9999 },
    { zone: 2, label: `Z2 — ${t('misc.zoneAerobic')}`,  color: '#22c55e', paceMin: css * 1.15, paceMax: css * 1.30 },
    { zone: 3, label: `Z3 — ${t('misc.zoneTempo')}`,    color: '#eab308', paceMin: css * 1.05, paceMax: css * 1.15 },
    { zone: 4, label: `Z4 — ${t('misc.zoneThreshold')}`,color: '#f97316', paceMin: css * 0.97, paceMax: css * 1.05 },
    { zone: 5, label: `Z5 — ${t('misc.zoneSprint')}`,   color: '#ef4444', paceMin: 0,          paceMax: css * 0.97 },
  ]
}

function parsePace(str: string): number {
  // "4:30" → 270 sec/km
  const [min, sec] = str.split(':').map(Number)
  return (min || 0) * 60 + (sec || 0)
}

function formatPace(sec: number, unit = '/km'): string {
  if (sec <= 0 || sec >= 9000) return '—'
  const m = Math.floor(sec / 60), s = Math.round(sec % 60)
  return `${m}:${String(s).padStart(2,'0')}${unit}`
}

function formatWatts(w: number): string {
  if (w <= 0 || w >= 9000) return '—'
  return `${Math.round(w)}W`
}

// ── Zone bar ──────────────────────────────────────
function ZoneBar({ zones, formatMin, formatMax }: {
  zones: any[]
  formatMin: (v: number) => string
  formatMax: (v: number) => string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
      {zones.map((z) => (
        <div key={z.zone} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: z.color + '22', border: `1px solid ${z.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: z.color }}>Z{z.zone}</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--text-mid)', fontWeight: 500 }}>{z.label}</span>
              <span style={{ fontSize: 11, fontFamily: 'DM Mono,monospace', color: z.color }}>
                {formatMin(z.wMin ?? z.paceMin)} — {formatMax(z.wMax ?? z.paceMax)}
              </span>
            </div>
            <div style={{ height: 6, borderRadius: 999, background: 'var(--border)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${z.zone * 20}%`, background: z.color, opacity: 0.7, borderRadius: 999 }}/>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Input helper ──────────────────────────────────
function Field({ label, value, onChange, placeholder, hint }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; hint?: string
}) {
  return (
    <div>
      <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.07em', color: 'var(--text-dim)', marginBottom: 5 }}>{label}</p>
      <input
        value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontFamily: 'DM Mono,monospace', fontSize: 13, outline: 'none' }}
      />
      {hint && <p style={{ fontSize: 10, color: 'var(--text-dim)', margin: '4px 0 0' }}>{hint}</p>}
    </div>
  )
}

// ═══════════════════════════════════════════════════
export default function ZonesPage() {
  const { t } = useI18n()
  const [tab, setTab] = useState<'run' | 'bike' | 'swim'>('run')

  // Run
  const [lthr,          setLthr]          = useState('172')
  const [thresholdPace, setThresholdPace] = useState('4:08')
  const [weight,        setWeight]        = useState('75')

  // Bike
  const [ftp,    setFtp]    = useState('301')
  const [lthrB,  setLthrB]  = useState('168')

  // Swim
  const [css,    setCss]    = useState('1:28')
  const [lthrS,  setLthrS]  = useState('160')

  const runZones  = calcRunZones(parseInt(lthr) || 172, parsePace(thresholdPace), t)
  const bikeZones = calcBikeZones(parseInt(ftp) || 300, t)
  const swimZones = calcSwimZones(parsePace(css || '1:28') * 100 / 100, t)

  const TABS = [
    { id: 'run'  as const, emoji: '🏃', label: t('misc.sportRunning')  },
    { id: 'bike' as const, emoji: '🚴', label: t('misc.sportCycling')  },
    { id: 'swim' as const, emoji: '🏊', label: t('misc.sportSwimming')  },
  ]

  return (
    <div style={{ padding: '24px 28px', maxWidth: '100%' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Syne,sans-serif', fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em', margin: 0 }}>
          {t('misc.zonesTitle')}
        </h1>
        <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: '5px 0 0' }}>
          {t('misc.zonesSubtitle')}
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '9px 18px', borderRadius: 11, border: '1px solid', borderColor: tab === t.id ? '#06B6D4' : 'var(--border)', background: tab === t.id ? 'rgba(6,182,212,0.10)' : 'var(--bg-card)', color: tab === t.id ? '#06B6D4' : 'var(--text-mid)', fontFamily: 'DM Sans,sans-serif', fontSize: 13, fontWeight: tab === t.id ? 600 : 400, cursor: 'pointer' }}>
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }} className="md:grid-cols-2">

        {/* ── RUNNING ── */}
        {tab === 'run' && (
          <>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 22, boxShadow: 'var(--shadow-card)' }}>
              <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: 15, fontWeight: 700, margin: '0 0 18px' }}>{t('misc.paramsRunningTitle')}</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Field label="LTHR (bpm)" value={lthr} onChange={setLthr} placeholder="172" hint={t('misc.hintLthr')}/>
                <Field label={t('misc.labelThresholdPace')} value={thresholdPace} onChange={setThresholdPace} placeholder="4:08" hint={t('misc.hintThresholdPace')}/>
                <Field label={t('misc.labelWeight')} value={weight} onChange={setWeight} placeholder="75" hint={t('misc.hintWeightTss')}/>
              </div>

              {/* Records */}
              <div style={{ marginTop: 20, padding: '14px 16px', borderRadius: 12, background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)' }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#06B6D4', margin: '0 0 12px' }}>📊 {t('misc.personalRecords')}</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { label: '1km', placeholder: "2:45" },
                    { label: '5km', placeholder: "18:30" },
                    { label: '10km', placeholder: "38:20" },
                    { label: t('misc.recordHalf'), placeholder: "1:25:00" },
                    { label: 'Marathon', placeholder: "2:58:00" },
                  ].map((r) => (
                    <div key={r.label}>
                      <p style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 3 }}>{r.label}</p>
                      <input placeholder={r.placeholder} style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontFamily: 'DM Mono,monospace', fontSize: 12, outline: 'none' }}/>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 22, boxShadow: 'var(--shadow-card)' }}>
              <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: 15, fontWeight: 700, margin: '0 0 4px' }}>{t('misc.zonesRunningTitle')}</h2>
              <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: '0 0 0' }}>{t('misc.zonesBasisRun', { lthr, pace: thresholdPace })}</p>
              <ZoneBar
                zones={runZones}
                formatMin={(v) => v >= 9000 ? '—' : formatPace(v)}
                formatMax={(v) => v >= 9000 ? '—' : formatPace(v)}
              />
              <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 10, background: 'var(--bg-card2)', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: 0, lineHeight: 1.6 }}>
                  💡 {t('misc.zonesAutoDetectHint')}
                </p>
              </div>
            </div>
          </>
        )}

        {/* ── CYCLISME ── */}
        {tab === 'bike' && (
          <>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 22, boxShadow: 'var(--shadow-card)' }}>
              <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: 15, fontWeight: 700, margin: '0 0 18px' }}>{t('misc.paramsCyclingTitle')}</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Field label="FTP (watts)" value={ftp} onChange={setFtp} placeholder="301" hint={t('misc.hintFtp')}/>
                <Field label={t('misc.labelLthrBike')} value={lthrB} onChange={setLthrB} placeholder="168" hint={t('misc.hintLthrBike')}/>
                <Field label={t('misc.labelWeight')} value={weight} onChange={setWeight} placeholder="75" hint={t('misc.hintWeightWkg')}/>
              </div>

              <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 10, background: 'rgba(91,111,255,0.07)', border: '1px solid rgba(91,111,255,0.15)' }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#5b6fff', margin: '0 0 4px' }}>{t('misc.currentWkg')}</p>
                <p style={{ fontFamily: 'Syne,sans-serif', fontSize: 22, fontWeight: 700, color: '#5b6fff', margin: 0 }}>
                  {ftp && weight ? (parseInt(ftp) / parseInt(weight)).toFixed(2) : '—'}
                  <span style={{ fontSize: 12, color: 'var(--text-dim)', marginLeft: 4 }}>W/kg</span>
                </p>
              </div>

              <div style={{ marginTop: 14, padding: '14px 16px', borderRadius: 12, background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)' }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#06B6D4', margin: '0 0 12px' }}>📊 {t('misc.personalRecords')}</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {['5min', '20min', '1h', 'Sprints'].map((r) => (
                    <div key={r}>
                      <p style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 3 }}>{t('misc.power')} {r}</p>
                      <input placeholder="—W" style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontFamily: 'DM Mono,monospace', fontSize: 12, outline: 'none' }}/>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 22, boxShadow: 'var(--shadow-card)' }}>
              <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: 15, fontWeight: 700, margin: '0 0 4px' }}>{t('misc.zonesCyclingTitle')}</h2>
              <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: '0 0 0' }}>{t('misc.zonesBasisBike', { ftp })}</p>
              <ZoneBar
                zones={bikeZones}
                formatMin={(v) => formatWatts(v)}
                formatMax={(v) => formatWatts(v)}
              />
            </div>
          </>
        )}

        {/* ── NATATION ── */}
        {tab === 'swim' && (
          <>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 22, boxShadow: 'var(--shadow-card)' }}>
              <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: 15, fontWeight: 700, margin: '0 0 18px' }}>{t('misc.paramsSwimmingTitle')}</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Field label={t('misc.labelCss')} value={css} onChange={setCss} placeholder="1:28" hint={t('misc.hintCss')}/>
                <Field label={t('misc.labelLthrSwim')} value={lthrS} onChange={setLthrS} placeholder="160" hint={t('misc.hintLthrSwim')}/>
              </div>

              <div style={{ marginTop: 20, padding: '14px 16px', borderRadius: 12, background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)' }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#06B6D4', margin: '0 0 12px' }}>📊 {t('misc.personalRecords')}</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {['100m', '200m', '400m', '1500m'].map((r) => (
                    <div key={r}>
                      <p style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 3 }}>{r}</p>
                      <input placeholder="—:——" style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontFamily: 'DM Mono,monospace', fontSize: 12, outline: 'none' }}/>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 22, boxShadow: 'var(--shadow-card)' }}>
              <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: 15, fontWeight: 700, margin: '0 0 4px' }}>{t('misc.zonesSwimmingTitle')}</h2>
              <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: '0 0 0' }}>{t('misc.zonesBasisSwim', { css })}</p>
              <ZoneBar
                zones={swimZones}
                formatMin={(v) => v >= 9000 ? '—' : formatPace(v, '/100m')}
                formatMax={(v) => v >= 9000 ? '—' : formatPace(v, '/100m')}
              />
            </div>
          </>
        )}
      </div>

      {/* Save */}
      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="primary">{t('misc.saveZones')}</Button>
      </div>
    </div>
  )
}
