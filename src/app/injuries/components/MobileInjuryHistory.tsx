'use client'
// ══════════════════════════════════════════════════════════════
// Blessures mobile — vue détail « Historique » (cartes blanches sur page
// grise, un sujet par carte) : frise des épisodes, liste des épisodes
// groupée par année (filtre Tous / En cours / Résolus), zones et sports les
// plus touchés. Chaque épisode est tappable → fiche de suivi (TrackSheet :
// édition, rééduc, journal, résolution). Aucune donnée inventée.
// ══════════════════════════════════════════════════════════════

import { useState } from 'react'
import { useI18n, currentLocale } from '@/lib/i18n'
import { DashCard } from '@/components/dashboard/primitives'
import { Segmented } from '@/components/ui/Segmented'
import { AnimatedBar } from '@/components/ui/AnimatedBar'
import { SEV, type Injury, type Severity } from '../types'
import { durationDays, isRecidive, zonesRanking, sportsRanking } from '../lib'

type Filter = 'all' | 'active' | 'resolved'
const DAY = 86400000
const NUM: React.CSSProperties = { fontVariantNumeric: 'tabular-nums', fontFeatureSettings: "'zero' 0" }
const ts = (d: string) => new Date(d + (d.length === 10 ? 'T12:00:00' : '')).getTime()
const I = (d: string) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
)
const IC = {
  frise: I('M3 3v18h18M7 16v-4M12 16V8M17 16v-7'),
  list: I('M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01'),
  zones: I('M22 12h-4l-3 9L9 3l-3 9H2'),
  sports: I('m3 17 6-6 4 4 8-8M14 7h7v7'),
}
export const SEV_KEY: Record<Severity, string> = { gene: 'injuries.sevGene', douleur: 'injuries.sevDouleur', blessure: 'injuries.sevBlessure' }
export const sideLabel = (inj: Injury) => (inj.side && inj.side !== 'central' ? ` · ${inj.side}` : '')

function fmtDay(d: string, withYear: boolean): string {
  return new Date(ts(d)).toLocaleDateString(currentLocale(), withYear ? { day: 'numeric', month: 'short', year: 'numeric' } : { day: 'numeric', month: 'short' })
}

/** « 2 → 20 juin » / « 28 mai → 3 juin » / « 12 déc. 2025 → 3 janv. 2026 ». */
function fmtRange(a: string, b: string): string {
  const da = new Date(ts(a)), db = new Date(ts(b))
  if (da.getFullYear() !== db.getFullYear()) return `${fmtDay(a, true)} → ${fmtDay(b, true)}`
  if (da.getMonth() === db.getMonth()) return `${da.getDate()} → ${fmtDay(b, false)}`
  return `${fmtDay(a, false)} → ${fmtDay(b, false)}`
}

const Chevron = () => (
  <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="m9 18 6-6-6-6" /></svg>
)

// ── Frise : une ligne par épisode, barre = durée réelle (début → résolution
//    ou aujourd'hui), couleur = sévérité. Positions en %, tailles fixes. ──
function Frise({ injuries, onOpen }: { injuries: Injury[]; onOpen: (i: Injury) => void }) {
  const { t } = useI18n()
  const rows = [...injuries].sort((a, b) => ts(b.onset_date) - ts(a.onset_date))
  const now = Date.now()
  const first = Math.min(...rows.map(i => ts(i.onset_date)))
  const pad = Math.max((now - first) * 0.04, 3 * DAY)
  const min = first - pad, max = now + pad
  const span = max - min || 1
  const pct = (tm: number) => Math.max(0, Math.min(100, ((tm - min) / span) * 100))
  const long = now - first > 330 * DAY
  const ticks = [0, 1, 2, 3, 4].map(k => min + (span * k) / 4)

  return (
    <div>
      {rows.map(i => {
        const c = SEV[i.severity].varc
        const x1 = pct(ts(i.onset_date))
        const x2 = pct(i.resolved_date ? ts(i.resolved_date) : now)
        return (
          <button key={i.id} type="button" onClick={() => onOpen(i)}
            aria-label={`${i.zone}${sideLabel(i)} · ${t(SEV_KEY[i.severity])} · ${durationDays(i)} ${t('injuries.dayUnit')}`}
            style={{ display: 'flex', alignItems: 'center', width: '100%', minHeight: 40, border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
            <span style={{ width: 84, flexShrink: 0, paddingRight: 8, fontSize: 13, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textTransform: 'capitalize' }}>{i.zone}</span>
            <span style={{ position: 'relative', flex: 1, height: 12 }}>
              <i style={{ position: 'absolute', top: 0, left: `${x1}%`, width: `${Math.max(x2 - x1, 1)}%`, minWidth: 12, height: 12, borderRadius: 'var(--r-pill)', background: c }} />
            </span>
          </button>
        )
      })}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, paddingLeft: 84 }}>
        {ticks.map((tk, k) => (
          <span key={k} style={{ ...NUM, fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
            {new Date(tk).toLocaleDateString(currentLocale(), long ? { month: 'short', year: '2-digit' } : { month: 'short' })}
          </span>
        ))}
      </div>
    </div>
  )
}

function EpisodeRow({ inj, all, first, last, onOpen }: { inj: Injury; all: Injury[]; first: boolean; last: boolean; onOpen: (i: Injury) => void }) {
  const { t } = useI18n()
  const active = inj.status === 'active'
  const when = active || !inj.resolved_date
    ? `${t('injm.sinceDate', { date: fmtDay(inj.onset_date, new Date(ts(inj.onset_date)).getFullYear() !== new Date().getFullYear()) })} · ${t('injm.ongoing')}`
    : `${fmtRange(inj.onset_date, inj.resolved_date)} · ${durationDays(inj)} ${t('injuries.dayUnit')}`
  return (
    <button type="button" onClick={() => onOpen(inj)}
      style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 44, textAlign: 'left', border: 'none', borderTop: first ? 'none' : '1px solid var(--dash-line, var(--border))', background: 'none', padding: `${first ? 0 : 12}px 0 ${last ? 0 : 12}px`, cursor: 'pointer', fontFamily: 'inherit' }}>
      <span aria-hidden style={{ width: 4, alignSelf: 'stretch', borderRadius: 4, background: SEV[inj.severity].varc, flexShrink: 0 }} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
          <b style={{ fontSize: 15, color: 'var(--text)', textTransform: 'capitalize', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{inj.zone}{sideLabel(inj)}</b>
          {isRecidive(inj, all) && <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', flexShrink: 0 }}>{t('injuries.recidiveTag')}</span>}
        </span>
        <span style={{ ...NUM, display: 'block', fontSize: 13, color: 'var(--text-mid)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {t(SEV_KEY[inj.severity])} · {when}
        </span>
      </span>
      <Chevron />
    </button>
  )
}

function RankCard({ icon, title, data, color }: { icon: React.ReactNode; title: string; data: { key: string; count: number }[]; color: string }) {
  const max = Math.max(...data.map(d => d.count), 1)
  return (
    <DashCard icon={icon} title={title}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {data.slice(0, 5).map(d => (
          <div key={d.key}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 14, marginBottom: 5 }}>
              <span style={{ fontWeight: 600, color: 'var(--text)', textTransform: 'capitalize', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.key}</span>
              <span style={{ ...NUM, color: 'var(--text-mid)', flexShrink: 0 }}>{d.count}</span>
            </div>
            <AnimatedBar pct={(d.count / max) * 100} color={color} height={8} />
          </div>
        ))}
      </div>
    </DashCard>
  )
}

export function MobileInjuryHistory({ injuries, onOpen, onReport }: {
  injuries: Injury[]
  onOpen: (inj: Injury) => void
  onReport: () => void
}) {
  const { t } = useI18n()
  const [filter, setFilter] = useState<Filter>('all')

  if (injuries.length === 0) {
    return (
      <DashCard icon={IC.frise} title={t('injuries.friseTitle')}>
        <p style={{ margin: 0, fontSize: 15, color: 'var(--text-mid)' }}>{t('injuries.friseEmpty')}</p>
        <button type="button" onClick={onReport}
          style={{ marginTop: 12, minHeight: 44, border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 15, fontWeight: 700, color: 'var(--primary)' }}>
          + {t('injuries.m.report')}
        </button>
      </DashCard>
    )
  }

  const now = Date.now()
  const first = Math.min(...injuries.map(i => ts(i.onset_date)))
  const spanMonths = Math.max(1, Math.round((now - first) / (30.44 * DAY)))
  const hasActive = injuries.some(i => i.status === 'active')
  const hasResolved = injuries.some(i => i.status === 'resolved')

  const eff: Filter = hasActive && hasResolved ? filter : 'all'
  const shown = [...injuries]
    .filter(i => eff === 'all' || i.status === eff)
    .sort((a, b) => ts(b.onset_date) - ts(a.onset_date))
  const groups: { year: number; items: Injury[] }[] = []
  for (const i of shown) {
    const y = new Date(ts(i.onset_date)).getFullYear()
    const g = groups[groups.length - 1]
    if (g && g.year === y) g.items.push(i)
    else groups.push({ year: y, items: [i] })
  }
  const showYears = groups.length > 1 || (groups[0] && groups[0].year !== new Date().getFullYear())
  const sports = sportsRanking(injuries)

  return (
    <>
      <DashCard icon={IC.frise} title={t('injuries.friseTitle')} meta={t('injm.months', { n: spanMonths })}>
        <Frise injuries={injuries} onOpen={onOpen} />
      </DashCard>

      <DashCard icon={IC.list} title={t('injuries.tabHistorySub')} meta={String(shown.length)}>
        {hasActive && hasResolved && (
          <div style={{ marginBottom: 14 }}>
            <Segmented<Filter> size="sm" value={eff} onChange={setFilter} ariaLabel={t('injuries.tabHistorySub')}
              options={[{ id: 'all', label: t('injm.filterAll') }, { id: 'active', label: t('injuries.ongoing') }, { id: 'resolved', label: t('injm.filterResolved') }]} />
          </div>
        )}
        {groups.map((g, gi) => (
          <div key={g.year} style={{ marginTop: gi ? 14 : 0 }}>
            {showYears && (
              <p style={{ ...NUM, margin: '0 0 8px', fontSize: 13, fontWeight: 700, letterSpacing: '0.04em', color: 'var(--text-dim)' }}>
                {g.year} · {g.items.length}
              </p>
            )}
            {g.items.map((inj, k) => <EpisodeRow key={inj.id} inj={inj} all={injuries} first={k === 0} last={k === g.items.length - 1} onOpen={onOpen} />)}
          </div>
        ))}
      </DashCard>

      <RankCard icon={IC.zones} title={t('injuries.rankZones')} data={zonesRanking(injuries)} color="var(--charge-hard)" />
      {sports.length > 0 && <RankCard icon={IC.sports} title={t('injuries.rankSports')} data={sports} color="var(--primary)" />}
    </>
  )
}
