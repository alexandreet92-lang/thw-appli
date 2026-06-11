'use client'
// Vue Records générique « par distance » (DESIGN_SYSTEM.md). Partagée Natation /
// Aviron : seules changent les distances, le barème, la teinte sport et l'unité
// d'allure. Pas de radar. Deux moments :
//  1. Jauges VERTICALES — hauteur = niveau vs barème (comparable), teinte modérée, animées.
//  2. Lignes détaillées : jauge horizontale + temps + allure auto + PR + Préc. + Modifier.
// Chiffres neutres (tokens). La teinte sport est fournie par l'appelant (constante sanctionnée).
import { useEffect, useState } from 'react'
import { Segmented } from '@/components/ui/Segmented'

export interface DistDef { id: string; m: number; label?: string }
export type Bench = Record<string, [number, number]> // [elite (niv.10), base (niv.0)] en s / paceBaseM

function toSec(t: string): number {
  if (!t || t === '—') return 0
  const p = t.split(':').map(Number)
  if (p.some(n => isNaN(n))) return 0
  return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + (p[1] || 0)
}
function paceStr(distM: number, sec: number, baseM: number, suffix: string): string | null {
  if (sec <= 0 || distM <= 0) return null
  const sp = sec / (distM / baseM)
  return `${Math.floor(sp / 60)}:${String(Math.round(sp % 60)).padStart(2, '0')}${suffix}`
}
function levelOf(id: string, distM: number, sec: number, baseM: number, bench: Bench): number {
  if (sec <= 0) return 0
  const [elite, base] = bench[id] ?? [60, 150]
  const p = sec / (distM / baseM)
  return Math.max(0, Math.min(10, ((base - p) / (base - elite)) * 10))
}

export interface DistanceRecordsProps {
  sportLabel: string
  color: string
  dists: DistDef[]
  benchH: Bench
  benchF?: Bench
  paceBaseM: number
  paceSuffix: string
  showGender?: boolean
  getBest: (dist: string) => { id: string; perf: string } | null
  getPrev: (dist: string) => { perf: string } | null
  onSelect: (label: string, value: string) => void
  onEdit: (dist: string, id: string | null, perf: string) => void
  selectedPerf?: string
}

export function DistanceRecords(props: DistanceRecordsProps) {
  const { sportLabel, color, dists, benchH, benchF, paceBaseM, paceSuffix, showGender, getBest, getPrev, onSelect, onEdit, selectedPerf } = props
  const [gender, setGender] = useState<'M' | 'F'>('M')
  const [mounted, setMounted] = useState(false)
  useEffect(() => { const t = setTimeout(() => setMounted(true), 30); return () => clearTimeout(t) }, [])
  const bench = gender === 'F' && benchF ? benchF : benchH

  const rows = dists.map(d => {
    const best = getBest(d.id)
    const sec = best ? toSec(best.perf) : 0
    return { ...d, best, sec, level: levelOf(d.id, d.m, sec, paceBaseM, bench), prev: getPrev(d.id) }
  })

  const card: React.CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 8, flexWrap: 'wrap' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Niveau par distance</h2>
          {showGender && benchF && (
            <Segmented size="sm" ariaLabel="Genre" value={gender} onChange={setGender}
              options={[{ id: 'M', label: 'H' }, { id: 'F', label: 'F' }]} />
          )}
        </div>

        {/* Jauges verticales — hauteur = niveau (0–10), comparable entre distances */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
          {rows.map(r => (
            <div key={r.id} style={{ flex: '1 0 auto', minWidth: 56, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <span className="tnum" style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600, color: r.sec > 0 ? 'var(--text)' : 'var(--text-dim)' }}>
                {r.best?.perf ?? '—'}
              </span>
              <div style={{ width: 22, height: 110, borderRadius: 'var(--r-sm)', background: 'var(--bg-card2)', display: 'flex', alignItems: 'flex-end', overflow: 'hidden' }}>
                <div style={{
                  width: '100%', height: mounted ? `${r.level * 10}%` : '0%',
                  background: color, opacity: 0.55, borderRadius: 'var(--r-sm)',
                  transition: 'height 0.9s cubic-bezier(0.32,0.72,0,1)',
                }} />
              </div>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--text-dim)' }}>{r.id}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Lignes détaillées + saisie */}
      <div style={card}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: '0 0 12px' }}>Records {sportLabel.toLowerCase()}</h2>
        {rows.map(r => {
          const perf = r.best?.perf ?? '—'
          const speed = r.sec > 0 ? paceStr(r.m, r.sec, paceBaseM, paceSuffix) : null
          const isPR = perf !== '—' && r.prev?.perf && r.prev.perf !== '—' && perf < r.prev.perf
          const sel = selectedPerf != null && perf !== '—' && selectedPerf === perf
          return (
            <div key={r.id} onClick={() => perf !== '—' ? onSelect(`${sportLabel} ${r.id}`, perf) : undefined}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 'var(--r-sm)', marginBottom: 4, cursor: perf !== '—' ? 'pointer' : 'default', background: sel ? 'var(--bg-card2)' : 'transparent', userSelect: 'none' }}>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 500, color: 'var(--text-mid)', minWidth: 78, flexShrink: 0 }}>{r.label ?? r.id}</span>
              {/* Jauge horizontale (niveau) */}
              <div style={{ flex: '0 0 64px', height: 6, borderRadius: 999, background: 'var(--bg-card2)', overflow: 'hidden' }}>
                <div style={{ width: mounted ? `${r.level * 10}%` : '0%', height: '100%', background: color, opacity: 0.5, transition: 'width 0.9s cubic-bezier(0.32,0.72,0,1)' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span className="tnum" style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{perf}</span>
                  {isPR && <span style={{ fontFamily: 'var(--font-body)', fontSize: 9, fontWeight: 700, color: 'var(--primary)' }}>PR</span>}
                  {speed && <span className="tnum" style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--text-dim)' }}>{speed}</span>}
                </div>
                {r.prev?.perf && r.prev.perf !== '—' && (
                  <span className="tnum" style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--text-dim)' }}>Préc. : {r.prev.perf}</span>
                )}
              </div>
              <button onClick={e => { e.stopPropagation(); onEdit(r.id, r.best?.id ?? null, r.best?.perf ?? '') }}
                style={{ flexShrink: 0, padding: 0, border: 'none', background: 'transparent', color: 'var(--primary)', fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                Modifier
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
