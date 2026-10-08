'use client'
// ══════════════════════════════════════════════════════════════
// Blessures mobile — onglet « Historique » (douleurs guéries) + fiche détail.
//  • HistoryList : une ligne par épisode résolu (zone, sévérité, période,
//    durée), groupée par année, tappable → fiche détail.
//  • InjuryHistoryDetail : courbe de fluctuation de la sévérité (pic →
//    guérison), frise d'événements (Déclarée → Aggravée → En amélioration →
//    Guérie, dates + pastilles de sévérité), origine, durée totale.
// Tout est dérivé des points réels (injury_logs) — aucune donnée inventée.
// ══════════════════════════════════════════════════════════════

import { useI18n, currentLocale } from '@/lib/i18n'
import { SEV, type Injury, type InjuryLog, type Severity } from '../types'
import {
  durationDays, isRecidive, severityPoints, severityColor, painTimeline,
  type SevPoint, type TimelineKind,
} from '../lib'
import { MBlock, MRow, MRowText, MTag, PillButton, NUM, FB, Ico } from './mobileUi'

const ts = (d: string) => new Date(d + (d.length === 10 ? 'T12:00:00' : '')).getTime()

// Conservés pour MobileInjuryAnalysis (analyse desktop/mobile héritée).
export const SEV_KEY: Record<Severity, string> = { gene: 'injuries.sevGene', douleur: 'injuries.sevDouleur', blessure: 'injuries.sevBlessure' }
export const sideLabel = (inj: Injury) => (inj.side && inj.side !== 'central' ? ` · ${inj.side}` : '')

function fmtDay(d: string, withYear: boolean): string {
  return new Date(ts(d)).toLocaleDateString(currentLocale(), withYear ? { day: 'numeric', month: 'short', year: 'numeric' } : { day: 'numeric', month: 'short' })
}
function fmtLong(d: string): string {
  return new Date(ts(d)).toLocaleDateString(currentLocale(), { day: 'numeric', month: 'long', year: 'numeric' })
}
function fmtRange(a: string, b: string): string {
  const da = new Date(ts(a)), db = new Date(ts(b))
  if (da.getFullYear() !== db.getFullYear()) return `${fmtDay(a, true)} → ${fmtDay(b, true)}`
  if (da.getMonth() === db.getMonth()) return `${da.getDate()} → ${fmtDay(b, false)}`
  return `${fmtDay(a, false)} → ${fmtDay(b, false)}`
}

const Chevron = () => (
  <span style={{ color: 'var(--text-dim)', display: 'flex', flexShrink: 0 }}><Ico d={<path d="m9 18 6-6-6-6" />} size={18} /></span>
)

// ── Liste des épisodes guéris ──────────────────────────────────────
export function HistoryList({ injuries, all, onOpen }: { injuries: Injury[]; all: Injury[]; onOpen: (i: Injury) => void }) {
  const { t } = useI18n()
  const shown = [...injuries].sort((a, b) => ts(b.onset_date) - ts(a.onset_date))
  const groups: { year: number; items: Injury[] }[] = []
  for (const i of shown) {
    const y = new Date(ts(i.onset_date)).getFullYear()
    const g = groups[groups.length - 1]
    if (g && g.year === y) g.items.push(i)
    else groups.push({ year: y, items: [i] })
  }
  const showYears = groups.length > 1 || (groups[0] && groups[0].year !== new Date().getFullYear())

  return (
    <MBlock title={t('injc.tabHistory')} right={<span style={{ ...NUM, fontSize: 15, fontWeight: 700, color: 'var(--text-mid)' }}>{shown.length}</span>}>
      {groups.map((g, gi) => (
        <div key={g.year} style={{ marginTop: gi ? 14 : 0 }}>
          {showYears && (
            <p style={{ ...NUM, margin: '0 0 4px', fontSize: 13, fontWeight: 700, letterSpacing: '0.04em', color: 'var(--text-dim)' }}>{g.year} · {g.items.length}</p>
          )}
          {g.items.map((inj, k) => {
            const when = inj.resolved_date ? `${fmtRange(inj.onset_date, inj.resolved_date)} · ${durationDays(inj)} ${t('injuries.dayUnit')}` : fmtDay(inj.onset_date, true)
            return (
              <MRow key={inj.id} first={k === 0} onClick={() => onOpen(inj)} label={`${inj.zone}${sideLabel(inj)}`}>
                <span aria-hidden style={{ width: 4, alignSelf: 'stretch', minHeight: 36, borderRadius: 4, background: SEV[inj.severity].varc, flexShrink: 0 }} />
                <MRowText
                  title={<span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 8, textTransform: 'capitalize' }}>{inj.zone}{sideLabel(inj)}{isRecidive(inj, all) && <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'none' }}>{t('injuries.recidiveTag')}</span>}</span>}
                  sub={<span style={NUM}>{t(SEV_KEY[inj.severity])} · {when}</span>} />
                <Chevron />
              </MRow>
            )
          })}
        </div>
      ))}
    </MBlock>
  )
}

// ── Courbe de fluctuation (SVG brut, pic → guérison) ───────────────
function FluctuationCurve({ pts }: { pts: SevPoint[] }) {
  const { t } = useI18n()
  const W = 320, H = 176, pl = 24, pr = 10, pt = 12, pb = 26, n = pts.length
  const peak = pts.reduce((m, p) => Math.max(m, p.v), 0)
  const col = severityColor(peak)
  const x = (i: number) => pl + (n === 1 ? (W - pl - pr) / 2 : (i / (n - 1)) * (W - pl - pr))
  const y = (v: number) => pt + (1 - v / 10) * (H - pt - pb)
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ')
  const area = `M${x(0).toFixed(1)},${(H - pb).toFixed(1)} ` + pts.map((p, i) => `L${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ') + ` L${x(n - 1).toFixed(1)},${(H - pb).toFixed(1)} Z`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} aria-hidden>
      {[0, 5, 10].map(v => (
        <g key={v}>
          <line x1={pl} y1={y(v)} x2={W - pr} y2={y(v)} stroke="var(--border)" strokeWidth={1} opacity={0.6} />
          <text x={pl - 5} y={y(v) + 3.5} fontFamily={FB} fontSize={10} fill="var(--text-dim)" textAnchor="end">{v}</text>
        </g>
      ))}
      {n > 1 && <path d={area} fill={col} opacity={0.12} />}
      {n > 1 && <path d={line} fill="none" stroke={col} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />}
      {pts.map((p, i) => <circle key={i} cx={x(i)} cy={y(p.v)} r={2.6} fill={col} />)}
      {n > 0 && <text x={pl} y={H - 7} fontFamily={FB} fontSize={10} fill="var(--text-dim)" textAnchor="start">{fmtDay(pts[0].date, false)}</text>}
      {n > 1 && <text x={W - pr} y={H - 7} fontFamily={FB} fontSize={10} fill="var(--text-dim)" textAnchor="end">{fmtDay(pts[n - 1].date, false)}</text>}
      {n < 2 && <text x={W / 2} y={H / 2} fontFamily={FB} fontSize={12} fill="var(--text-dim)" textAnchor="middle">{t('injuries.curveNotEnough')}</text>}
    </svg>
  )
}

const TL_COLOR: Record<TimelineKind, string> = {
  declared: 'var(--text-mid)', worsened: 'var(--charge-hard)', improving: 'var(--charge-low)', healed: 'var(--charge-low)',
}
const TL_KEY: Record<TimelineKind, string> = {
  declared: 'injc.evDeclared', worsened: 'injc.evWorsened', improving: 'injc.evImproving', healed: 'injc.evHealed',
}

// ── Fiche détail d'un épisode guéri ────────────────────────────────
export function InjuryHistoryDetail({ inj, logs, onOpen }: { inj: Injury; logs: InjuryLog[]; onOpen: (i: Injury) => void }) {
  const { t } = useI18n()
  const basePts = severityPoints(logs, inj.id)
  // Guérison = retour à 0 : on prolonge la courbe jusqu'à la date de résolution
  // (fait réel : plus de douleur), sans inventer de valeur intermédiaire.
  const pts: SevPoint[] = inj.resolved_date && (!basePts.length || basePts[basePts.length - 1].v > 0)
    ? [...basePts, { date: inj.resolved_date, v: 0 }]
    : basePts
  const events = painTimeline(inj, logs)
  const origin = [
    inj.mechanism ? (inj.mechanism === 'soudaine' ? t('injuries.mechSudden') : t('injuries.mechProgressive')) : null,
    inj.activity,
    inj.description,
  ].filter(Boolean) as string[]

  return (
    <>
      <MBlock>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text)', textTransform: 'capitalize', letterSpacing: '-0.01em' }}>{inj.zone}{sideLabel(inj)}</h2>
            <p style={{ ...NUM, margin: '2px 0 0', fontSize: 13, color: 'var(--text-mid)' }}>{inj.resolved_date ? fmtRange(inj.onset_date, inj.resolved_date) : fmtLong(inj.onset_date)}</p>
          </div>
          <MTag color="var(--charge-low)">{t('injc.chipHealed')}</MTag>
        </div>
        <div style={{ display: 'flex', gap: 24, marginTop: 14 }}>
          <div>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-mid)' }}>{t('injc.duration')}</p>
            <p style={{ ...NUM, margin: '2px 0 0', fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>{durationDays(inj)} <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-mid)' }}>{t('injuries.dayUnit')}</span></p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-mid)' }}>{t('injc.severity')}</p>
            <p style={{ ...NUM, margin: '2px 0 0', fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>{t(SEV_KEY[inj.severity])}</p>
          </div>
        </div>
      </MBlock>

      <MBlock title={t('injc.fluctuation')}>
        <FluctuationCurve pts={pts} />
      </MBlock>

      <MBlock title={t('injc.timeline')}>
        {events.map((e, i) => (
          <div key={i} style={{ position: 'relative', display: 'flex', gap: 12, paddingBottom: i < events.length - 1 ? 16 : 0 }}>
            <span aria-hidden style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: TL_COLOR[e.kind], marginTop: 3 }} />
              {i < events.length - 1 && <span style={{ flex: 1, width: 2, background: 'var(--border)', marginTop: 2 }} />}
            </span>
            <span style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
              <span>
                <span style={{ display: 'block', fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{t(TL_KEY[e.kind])}</span>
                <span style={{ ...NUM, display: 'block', fontSize: 13, color: 'var(--text-mid)', marginTop: 1 }}>{fmtLong(e.date)}</span>
              </span>
              {e.severity != null && <MTag color={severityColor(e.severity)}><span style={NUM}>{e.severity}/10</span></MTag>}
            </span>
          </div>
        ))}
      </MBlock>

      {origin.length > 0 && (
        <MBlock title={t('injc.origin')}>
          {inj.activity && <MRow first><MRowText title={inj.activity} sub={inj.mechanism ? (inj.mechanism === 'soudaine' ? t('injuries.mechSudden') : t('injuries.mechProgressive')) : undefined} /></MRow>}
          {inj.description && <MRow first={!inj.activity}><MRowText title={inj.description} /></MRow>}
          {!inj.activity && !inj.description && inj.mechanism && <MRow first><MRowText title={inj.mechanism === 'soudaine' ? t('injuries.mechSudden') : t('injuries.mechProgressive')} /></MRow>}
        </MBlock>
      )}

      <PillButton variant="white" onClick={() => onOpen(inj)}>{t('injc.fullRecord')}</PillButton>
    </>
  )
}
