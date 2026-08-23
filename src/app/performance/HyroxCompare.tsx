'use client'
// Comparaison Hyrox (DS). Sélecteur de segment : Général (total) · 8 stations ·
// Run compromised. Les courses sont des jauges verticales — en Général triées
// chrono, sur un segment triées meilleur→moins bon (« les courses où on a été
// les meilleurs »). Clic sur une jauge → surpage détail (toutes stations + run
// compromised + runs, repère = moyenne). Chiffres neutres.
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '@/lib/i18n'
import { HYROX_STATIONS, toSec, hmsTotal, mmss, type HyroxRace } from './hyroxShared'
import { currentLocale } from '@/lib/i18n'

const HYROX = '#ec4899' // design-allow-color — teinte sport hyrox sanctionnée

function fmtDate(iso: string) { return new Date(iso).toLocaleDateString(currentLocale(), { month: 'short', year: '2-digit' }) }
function fmtDateFull(iso: string) { return new Date(iso).toLocaleDateString(currentLocale(), { day: '2-digit', month: 'short', year: 'numeric' }) }
function mean(xs: number[]) { const v = xs.filter(x => x > 0); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0 }

type Seg = 'overall' | 'run' | string  // 'overall' | 'run' | nom de station

// Valeur (s) d'une course pour un segment donné.
function segSec(r: HyroxRace, seg: Seg): number {
  if (seg === 'overall') return toSec(r.temps_final)
  if (seg === 'run') return toSec(r.temps_run_total ?? '')
  return toSec(r.stations[seg] ?? '')
}
function segStr(sec: number, seg: Seg): string {
  if (sec <= 0) return '—'
  return seg === 'overall' || seg === 'run' ? hmsTotal(sec) : mmss(sec)
}

// ── Surpage détail d'une course ───────────────────────────────────
function HyroxRaceOverlay({ race, races, onSelect, onClose }: {
  race: HyroxRace; races: HyroxRace[]; onSelect?: (l: string, v: string) => void; onClose: () => void
}) {
  const { t } = useI18n()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { const id = setTimeout(() => setMounted(true), 20); return () => clearTimeout(id) }, [])
  const bars = [
    ...HYROX_STATIONS.map(s => ({ label: s, color: HYROX, sec: toSec(race.stations[s] ?? ''), max: Math.max(...races.map(r => toSec(r.stations[s] ?? '')), 1), avg: mean(races.map(r => toSec(r.stations[s] ?? ''))) })),
    { label: 'Run compromised', color: 'var(--primary)', sec: toSec(race.temps_run_total ?? ''), max: Math.max(...races.map(r => toSec(r.temps_run_total ?? '')), 1), avg: mean(races.map(r => toSec(r.temps_run_total ?? ''))) },
  ]
  return createPortal(
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, zIndex: 3300, background: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 560, maxHeight: 'calc(100dvh - 56px)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '20px 20px 0 0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text)' }}>{race.temps_final}</h2>
            <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: '3px 0 0' }}>{fmtDateFull(race.date)}{race.partenaire ? ` · ${race.partenaire}` : ''}</p>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 17 }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14, gap: 8 }}>
            <h3 style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', margin: 0 }}>{t('perf2.stationDetail')}</h3>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--text-dim)' }}>{t('performance.markerAverage')}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {bars.map(b => {
              const valStr = b.sec > 0 ? (b.label === 'Run compromised' ? hmsTotal(b.sec) : mmss(b.sec)) : '—'
              return (
                <div key={b.label} onClick={() => b.sec > 0 && onSelect?.(`Hyrox ${b.label}`, valStr)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: b.sec > 0 && onSelect ? 'pointer' : 'default' }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-mid)', width: 116, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.label}</span>
                  <div style={{ flex: 1, position: 'relative', height: 8, borderRadius: 999, background: 'var(--bg-card2)', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', inset: 0, width: mounted ? `${(b.sec / b.max) * 100}%` : '0%', background: b.color, opacity: 0.55, borderRadius: 999, transition: 'width 0.9s cubic-bezier(0.32,0.72,0,1)' }} />
                    {b.avg > 0 && <span style={{ position: 'absolute', top: -2, bottom: -2, left: `${(b.avg / b.max) * 100}%`, width: 2, background: 'var(--text-mid)', borderRadius: 2 }} />}
                  </div>
                  <span className="tnum" style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600, color: b.sec > 0 ? 'var(--text)' : 'var(--text-dim)', width: 56, textAlign: 'right', flexShrink: 0 }}>{valStr}</span>
                </div>
              )
            })}
          </div>
          {/* Runs individuels */}
          {race.runs?.some(x => x) && (
            <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>Runs</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 12px' }}>
                {race.runs.map((r, i) => r ? <span key={i} className="tnum" style={{ fontSize: 11, color: 'var(--text-mid)' }}>#{i + 1} {r}</span> : null)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

export function HyroxCompare({ races, onSelect }: { races: HyroxRace[]; onSelect?: (label: string, value: string) => void }) {
  const { t } = useI18n()
  const [seg, setSeg] = useState<Seg>('overall')
  const [detail, setDetail] = useState<HyroxRace | null>(null)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { const id = setTimeout(() => setMounted(true), 30); return () => clearTimeout(id) }, [])
  if (races.length === 0) return null

  // Général : chrono (ancien→récent). Segment : meilleur→moins bon.
  const withVal = races.map(r => ({ r, sec: segSec(r, seg) }))
  const ordered = seg === 'overall'
    ? [...withVal].reverse()
    : [...withVal].filter(x => x.sec > 0).sort((a, b) => a.sec - b.sec)
  const maxSec = Math.max(...ordered.map(x => x.sec), 1)

  const segOptions: { id: Seg; label: string }[] = [
    { id: 'overall', label: t('perf2.overall') },
    ...HYROX_STATIONS.map(s => ({ id: s, label: s })),
    { id: 'run', label: 'Run comp.' },
  ]
  const card: React.CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }
  const chip = (active: boolean): React.CSSProperties => ({
    padding: '5px 11px', borderRadius: 999, cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 11,
    fontWeight: active ? 600 : 500, border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
    background: active ? 'var(--primary-dim)' : 'transparent', color: active ? 'var(--primary)' : 'var(--text-dim)', whiteSpace: 'nowrap',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 8, flexWrap: 'wrap' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: 0 }}>
            {seg === 'overall' ? t('performance.races') : t('perf2.bestRaces')}
          </h2>
        </div>

        {/* Sélecteur de segment : Général · 8 stations · Run comp. */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 6, scrollbarWidth: 'none' }}>
          {segOptions.map(o => (
            <button key={o.id} onClick={() => setSeg(o.id)} style={chip(seg === o.id)}>{o.label}</button>
          ))}
        </div>

        {/* Jauges courses — clic → surpage */}
        {ordered.length === 0 ? (
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-dim)', margin: '8px 0 0' }}>{t('perf2.addTimeToSee', { dist: segOptions.find(o => o.id === seg)?.label ?? '' })}</p>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
            {ordered.map(({ r, sec }, i) => {
              const isBest = seg !== 'overall' && i === 0
              return (
                <button key={r.id} onClick={() => setDetail(r)}
                  style={{ flex: '1 0 auto', minWidth: 52, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}>
                  <span className="tnum" style={{ fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 600, color: 'var(--text)' }}>{segStr(sec, seg)}</span>
                  <div style={{ width: 24, height: 110, borderRadius: 'var(--r-sm)', background: 'var(--bg-card2)', display: 'flex', alignItems: 'flex-end', overflow: 'hidden', outline: isBest ? '1px solid var(--primary)' : 'none' }}>
                    <div style={{ width: '100%', height: mounted ? `${(sec / maxSec) * 100}%` : '0%', background: seg === 'run' ? 'var(--primary)' : HYROX, opacity: isBest ? 0.75 : 0.45, transition: 'height 0.9s cubic-bezier(0.32,0.72,0,1)' }} />
                  </div>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--text-dim)' }}>{fmtDate(r.date)}</span>
                  {isBest && <span style={{ fontSize: 8, fontWeight: 700, color: 'var(--primary)' }}>★</span>}
                </button>
              )
            })}
          </div>
        )}
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--text-dim)', margin: '10px 0 0' }}>{t('perf2.tapRaceForBreakdown')}</p>
      </div>

      {detail && <HyroxRaceOverlay race={detail} races={races} onSelect={onSelect} onClose={() => setDetail(null)} />}
    </div>
  )
}
