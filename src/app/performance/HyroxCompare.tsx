'use client'
// Comparaison Hyrox (DS) : 1) courses entre elles — barres verticales (hauteur = total,
// teinte hyrox modérée, animées, cliquables). 2) Stations + run compromised — barres
// horizontales avec repère = moyenne (sur les courses affichées). Chiffres neutres.
import { useEffect, useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { HYROX_STATIONS, toSec, hmsTotal, mmss, type HyroxRace } from './hyroxShared'

const HYROX = '#ec4899' // design-allow-color — teinte sport hyrox sanctionnée

function fmtDate(iso: string) { return new Date(iso).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }) }
function mean(xs: number[]) { const v = xs.filter(x => x > 0); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0 }

export function HyroxCompare({ races, onSelect }: { races: HyroxRace[]; onSelect?: (label: string, value: string) => void }) {
  const { t } = useI18n()
  const [selId, setSelId] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { const t = setTimeout(() => setMounted(true), 30); return () => clearTimeout(t) }, [])
  if (races.length === 0) return null

  const ordered = [...races].reverse() // anciennes → récentes pour la lecture
  const sel = races.find(r => r.id === selId) ?? races[0]
  const maxTotal = Math.max(...races.map(r => toSec(r.temps_final)))

  // Barres horizontales : 8 stations + run compromised (chacune normalisée à son propre max).
  const bars = [
    ...HYROX_STATIONS.map(s => ({
      label: s, color: HYROX,
      sec: toSec(sel.stations[s] ?? ''),
      max: Math.max(...races.map(r => toSec(r.stations[s] ?? '')), 1),
      avg: mean(races.map(r => toSec(r.stations[s] ?? ''))),
    })),
    {
      label: 'Run compromised', color: 'var(--primary)',
      sec: toSec(sel.temps_run_total ?? ''),
      max: Math.max(...races.map(r => toSec(r.temps_run_total ?? '')), 1),
      avg: mean(races.map(r => toSec(r.temps_run_total ?? ''))),
    },
  ]

  const card: React.CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Courses entre elles */}
      <div style={card}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: '0 0 16px' }}>{t('performance.races')}</h2>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
          {ordered.map(r => {
            const on = r.id === sel.id
            return (
              <button key={r.id} onClick={() => setSelId(r.id)}
                style={{ flex: '1 0 auto', minWidth: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}>
                <span className="tnum" style={{ fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 600, color: on ? 'var(--text)' : 'var(--text-dim)' }}>{r.temps_final}</span>
                <div style={{ width: 24, height: 110, borderRadius: 'var(--r-sm)', background: 'var(--bg-card2)', display: 'flex', alignItems: 'flex-end', overflow: 'hidden', outline: on ? '1px solid var(--primary)' : 'none' }}>
                  <div style={{ width: '100%', height: mounted ? `${(toSec(r.temps_final) / maxTotal) * 100}%` : '0%', background: HYROX, opacity: on ? 0.7 : 0.4, transition: 'height 0.9s cubic-bezier(0.32,0.72,0,1)' }} />
                </div>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--text-dim)' }}>{fmtDate(r.date)}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Stations + run compromised */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16, gap: 8 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{t('performance.detail')} — {fmtDate(sel.date)}</h2>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-dim)' }}>{t('performance.markerAverage')}</span>
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
              <span className="tnum" style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600, color: b.sec > 0 ? 'var(--text)' : 'var(--text-dim)', width: 56, textAlign: 'right', flexShrink: 0 }}>
                {valStr}
              </span>
            </div>
          )})}
        </div>
      </div>
    </div>
  )
}
