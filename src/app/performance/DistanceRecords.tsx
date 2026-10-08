'use client'
// Vue Records générique « par distance » (DESIGN_SYSTEM.md). Partagée Natation /
// Aviron : seules changent les distances, le barème, la teinte sport et l'unité
// d'allure. Pas de radar. Deux moments :
//  1. Jauges VERTICALES — hauteur = niveau vs barème (comparable), teinte modérée, animées.
//  2. Lignes détaillées : jauge horizontale + temps + allure auto + PR + Préc. + Modifier.
// Chiffres neutres (tokens). La teinte sport est fournie par l'appelant (constante sanctionnée).
import { useEffect, useState } from 'react'
import { useI18n, currentLocale } from '@/lib/i18n'
import { Segmented } from '@/components/ui/Segmented'
import { MCard, MBars, MRow, MLink, MEmpty, M_ICONS, shortDay, FB } from './mobile/kit'

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
  getBest: (dist: string) => { id: string; perf: string; date?: string } | null
  getPrev: (dist: string) => { perf: string } | null
  onSelect: (label: string, value: string) => void
  onEdit: (dist: string, id: string | null, perf: string) => void
  selectedPerf?: string
  /** Mobile : cartes « Niveau par distance » + « Records » façon Strava. */
  mobile?: boolean
  /** Mobile : complément affiché sous l'allure (ex. watts Concept2 en aviron). */
  extra?: (distM: number, sec: number) => string | null
}

export function DistanceRecords(props: DistanceRecordsProps) {
  const { sportLabel, color, dists, benchH, benchF, paceBaseM, paceSuffix, showGender, getBest, getPrev, onSelect, onEdit, selectedPerf, mobile, extra } = props
  const { t } = useI18n()
  const [gender, setGender] = useState<'M' | 'F'>('M')
  const [showAll, setShowAll] = useState(false)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { const t = setTimeout(() => setMounted(true), 30); return () => clearTimeout(t) }, [])
  const bench = gender === 'F' && benchF ? benchF : benchH

  const rows = dists.map(d => {
    const best = getBest(d.id)
    const sec = best ? toSec(best.perf) : 0
    return { ...d, best, sec, level: levelOf(d.id, d.m, sec, paceBaseM, bench), prev: getPrev(d.id) }
  })

  if (mobile) {
    const loc = currentLocale()
    const done = rows.filter(r => r.sec > 0)
    const fmtDist = (r: DistDef) => r.label ?? (r.m >= 1000 && /^\d+m$/.test(r.id) ? `${r.m.toLocaleString(loc)} m` : r.id.replace(/^(\d+)m$/, '$1 m'))
    const listed = showAll ? rows : done.slice(0, 4)
    const hf = showGender && benchF ? (
      <span style={{ display: 'inline-flex', padding: 2, borderRadius: 'var(--r-pill)', background: 'var(--dash-chip, var(--bg-card2))' }}>
        {(['M', 'F'] as const).map(g => (
          <button key={g} type="button" onClick={() => setGender(g)} aria-pressed={gender === g} aria-label={t('performance.genderLabel')}
            style={{ minWidth: 44, minHeight: 36, borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer', fontFamily: FB, fontSize: 14, fontWeight: 700,
              background: gender === g ? 'var(--float-bg)' : 'transparent', color: gender === g ? 'var(--text)' : 'var(--text-mid)',
              boxShadow: gender === g ? 'var(--shadow-card, none)' : 'none', transition: 'background 0.18s ease, color 0.18s ease' }}>{g === 'M' ? 'H' : 'F'}</button>
        ))}
      </span>
    ) : undefined
    return (
      <>
        <MCard icon={M_ICONS.chart} title={t('performance.levelByDistance')} meta={hf}>
          {done.length === 0
            ? <MEmpty>{t('perf.m.noRecord')}</MEmpty>
            : <MBars height={100} bars={done.map(r => ({
                key: r.id, top: r.best?.perf ?? '—', bottom: fmtDist(r), pct: r.level * 10, color,
                onClick: () => onEdit(r.id, r.best?.id ?? null, r.best?.perf ?? ''), ariaLabel: `${t('performance.edit')} ${fmtDist(r)}`,
              }))} />}
        </MCard>
        <MCard icon={M_ICONS.trophy} title={t('performance.recordsOf', { sport: sportLabel.toLowerCase() })} meta={done.length ? String(done.length) : undefined}>
          {listed.length === 0 && <MEmpty>{t('perf.m.noRecord')}</MEmpty>}
          {listed.map((r, i) => {
            const perf = r.best?.perf ?? '—'
            const prev = r.prev?.perf && r.prev.perf !== '—' ? r.prev.perf : null
            const pace = r.sec > 0 ? paceStr(r.m, r.sec, paceBaseM, ` ${paceSuffix}`) : null
            const ex = r.sec > 0 && extra ? extra(r.m, r.sec) : null
            const date = r.best?.date ? shortDay(r.best.date, loc) : ''
            return (
              <MRow key={r.id} first={i === 0} label={fmtDist(r)} value={perf} dim={r.sec <= 0}
                sub={r.sec > 0 ? [date, `${t('perf.m.prev')} ${prev ?? '—'}`].filter(Boolean).join(' · ') : t('performance.edit')}
                right2={[pace, ex].filter(Boolean).join(' · ') || undefined}
                pr={!!prev && r.sec > 0 && r.sec < toSec(prev)}
                onClick={() => onEdit(r.id, r.best?.id ?? null, r.best?.perf ?? '')} />
            )
          })}
          {(showAll || done.length < rows.length || done.length > 4) && (
            <MLink first={listed.length === 0} onClick={() => setShowAll(v => !v)}>
              {showAll ? t('perfm.seeLess') : t('perfm.seeAllDistances', { n: rows.length })}
            </MLink>
          )}
        </MCard>
      </>
    )
  }

  const card: React.CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 20 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 8, flexWrap: 'wrap' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{t('performance.levelByDistance')}</h2>
          {showGender && benchF && (
            <Segmented size="sm" ariaLabel={t('performance.genderLabel')} value={gender} onChange={setGender}
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
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: '0 0 12px' }}>{t('performance.recordsOf', { sport: sportLabel.toLowerCase() })}</h2>
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
              <div style={{ flex: '0 0 64px', height: 6, borderRadius: 'var(--r-pill)', background: 'var(--bg-card2)', overflow: 'hidden' }}>
                <div style={{ width: mounted ? `${r.level * 10}%` : '0%', height: '100%', background: color, opacity: 0.5, transition: 'width 0.9s cubic-bezier(0.32,0.72,0,1)' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span className="tnum" style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{perf}</span>
                  {isPR && <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 700, color: 'var(--primary)' }}>PR</span>}
                  {speed && <span className="tnum" style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--text-dim)' }}>{speed}</span>}
                </div>
                {r.prev?.perf && r.prev.perf !== '—' && (
                  <span className="tnum" style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--text-dim)' }}>{t('performance.previous')} : {r.prev.perf}</span>
                )}
              </div>
              <button onClick={e => { e.stopPropagation(); onEdit(r.id, r.best?.id ?? null, r.best?.perf ?? '') }}
                style={{ flexShrink: 0, padding: 0, border: 'none', background: 'transparent', color: 'var(--primary)', fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                {t('performance.edit')}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
