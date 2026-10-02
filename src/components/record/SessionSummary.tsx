'use client'
// ══════════════════════════════════════════════════════════════════════════
// Résumé de fin de séance (page A). S'ouvre automatiquement après la voix
// « Félicitations… / Voici le résumé de votre séance ». Montre TOUTES les
// données : temps, rounds/exos, séries, volume, calories, FC ; graphique
// cible (puissance/allure) + FC mesurée si capteur ; liste des exos réalisés.
// Bouton « Suivant » (bleu app) → page d'enregistrement (slide droite→gauche,
// géré par le parent). Suit le thème de l'app (clair/sombre) — jamais de fond
// noir forcé qui rendait certaines données invisibles.
// ══════════════════════════════════════════════════════════════════════════
import { useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { sportLabel } from '@/components/recovery/helpers'
import { useI18n } from '@/lib/i18n'
import type { FinishedSession } from '@/types/session'
import type { CompletedEffortLocal } from '@/types/segment'
import SessionSummaryPage1 from './SessionSummaryPage1'
import SessionSummaryPage2 from './SessionSummaryPage2'
import { rkScope, RkFab, RkFabSpacer, RkIco, RK_ICON, RkStatusPill, RkGrid, RkCell, RkCta, RK_SPRING } from './kit/RecordKit'

export interface TargetSeries { pts: { t: number; v: number }[]; unit: string; kind: string }
export interface SummaryHr { avg: number | null; max: number | null; min: number | null; samples: number[] }

interface WorkoutProps {
  sportType: string
  startedAt: string
  durationSec: number
  doneList: { label: string; detail?: string }[]
  sets: number
  volumeKg: number
  caloriesEst: number
  doneCount: number
  totalCount: number
  unitLabel: string          // 'ROUNDS' | 'EXOS'
  hr: SummaryHr
  target: TargetSeries | null
  accent: string
  isDark: boolean
  onNext: () => void
  onClose?: () => void
}

/** Récap d'une sortie GPS déjà enregistrée (Running, Trail, Rando, VTT). */
interface GpsProps {
  session: FinishedSession
  isDark: boolean
  onClose: () => void
  completedEfforts?: CompletedEffortLocal[]
}

type Props = WorkoutProps | GpsProps

const HR_COLOR = 'var(--danger)'

// Thème : tokens (clair/sombre via rkScope sur le conteneur).
function theme() {
  return {
    text: 'var(--text)', muted: 'var(--text-mid)', faint: 'var(--text-dim)',
    tileBg: 'var(--surface-card)', grid: 'var(--border)', listBorder: 'var(--border)',
  }
}

function fmtClock(s: number): string {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60)
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`
}

// Graphique cible + FC mesurée (SVG, aucune lib).
function SessionChart({ target, hr, accent, T, t }: { target: TargetSeries | null; hr: SummaryHr; accent: string; T: ReturnType<typeof theme>; t: (key: string, vars?: Record<string, string | number>) => string }) {
  const W = 720, H = 200, padL = 8, padR = 8, padT = 14, padB = 22
  const hasTarget = target && target.pts.length > 1
  const hasHr = hr.samples.length > 1
  if (!hasTarget && !hasHr) return null

  const totalT = hasTarget ? Math.max(...target!.pts.map(p => p.t), 1) : hr.samples.length
  const tx = (t: number) => padL + (t / totalT) * (W - padL - padR)

  let targetPath = '', targetArea = '', tMax = 1, tUnit = ''
  if (hasTarget) {
    tUnit = target!.unit
    tMax = Math.max(...target!.pts.map(p => p.v), 1)
    const ty = (v: number) => padT + (1 - v / (tMax * 1.1)) * (H - padT - padB)
    targetPath = target!.pts.map((p, i) => `${i ? 'L' : 'M'}${tx(p.t).toFixed(1)},${ty(p.v).toFixed(1)}`).join(' ')
    targetArea = `${targetPath} L${tx(totalT).toFixed(1)},${H - padB} L${tx(0).toFixed(1)},${H - padB} Z`
  }
  let hrPath = '', hMin = 0, hMax = 0
  if (hasHr) {
    hMin = Math.min(...hr.samples); hMax = Math.max(...hr.samples)
    const range = hMax - hMin || 1
    const hy = (v: number) => padT + (1 - (v - hMin) / range) * (H - padT - padB)
    const hxs = (i: number) => padL + (i / (hr.samples.length - 1)) * (W - padL - padR)
    hrPath = hr.samples.map((v, i) => `${i ? 'L' : 'M'}${hxs(i).toFixed(1)},${hy(v).toFixed(1)}`).join(' ')
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 8, flexWrap: 'wrap' }}>
        {hasTarget && <Legend c={accent} label={t('w3a.legend_target', { unit: tUnit })} T={T} />}
        {hasHr && <Legend c={HR_COLOR} label={t('w3a.legend_hr')} T={T} />}
      </div>
      <div style={{ width: '100%', overflow: 'hidden' }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: 'block' }}>
          <defs><linearGradient id="tgtFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={accent} stopOpacity="0.28" /><stop offset="100%" stopColor={accent} stopOpacity="0.02" /></linearGradient></defs>
          {[0, 0.5, 1].map(f => <line key={f} x1={padL} y1={padT + f * (H - padT - padB)} x2={W - padR} y2={padT + f * (H - padT - padB)} stroke={T.grid} strokeWidth={1} />)}
          {hasTarget && <><path d={targetArea} fill="url(#tgtFill)" /><path d={targetPath} fill="none" stroke={accent} strokeWidth={2.4} strokeLinejoin="round" vectorEffect="non-scaling-stroke" /></>}
          {hasHr && <path d={hrPath} fill="none" stroke={HR_COLOR} strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
        </svg>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
        <span style={{ fontSize: 11, color: T.faint }}>0:00</span>
        <span style={{ fontSize: 11, color: T.faint }}>{hasTarget ? fmtClock(totalT) : ''}</span>
      </div>
    </div>
  )
}
function Legend({ c, label, T }: { c: string; label: string; T: ReturnType<typeof theme> }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: T.muted }}><span style={{ width: 9, height: 3, borderRadius: 2, background: c }} />{label}</span>
}

export default function SessionSummary(props: Props) {
  if ('session' in props) return <GpsRecap {...props} />
  return <WorkoutRecap {...props} />
}

// ── Récap séance guidée (muscu / Hyrox / boxe) ───────────────────────
function WorkoutRecap({ sportType, startedAt, durationSec, doneList, sets, volumeKg, caloriesEst, doneCount, totalCount, unitLabel, hr, target, accent, isDark, onNext, onClose }: WorkoutProps) {
  const { t } = useI18n()
  const T = theme()
  const reduce = useReducedMotion()
  const [closing, setClosing] = useState(false)
  const requestClose = () => { if (!onClose) return; setClosing(true); setTimeout(onClose, 300) }
  const date = new Date(startedAt).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  const kpis: { label: string; value: string; unit?: string }[] = [
    { label: unitLabel, value: `${doneCount}/${totalCount}` },
  ]
  if (sets > 0) kpis.push({ label: t('w3a.kpi_series'), value: String(sets) })
  if (volumeKg > 0) kpis.push({ label: t('w3a.kpi_volume'), value: String(Math.round(volumeKg)), unit: 'kg' })
  if (caloriesEst > 0) kpis.push({ label: t('w3a.kpi_calories'), value: String(caloriesEst), unit: 'kcal' })
  if (hr.avg != null) kpis.push({ label: t('w3a.kpi_hr_avg'), value: `${hr.avg}`, unit: 'bpm' })
  if (hr.max != null) kpis.push({ label: t('w3a.kpi_hr_max'), value: `${hr.max}`, unit: 'bpm' })

  const card: React.CSSProperties = { background: 'var(--surface-card)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }

  return (
    <motion.div className={rkScope(isDark)}
      initial={{ y: reduce ? 0 : '100%', opacity: reduce ? 0 : 1 }}
      animate={closing ? { y: reduce ? 0 : '100%', opacity: reduce ? 0 : 1 } : { y: 0, opacity: 1 }}
      transition={reduce ? { duration: 0.15 } : RK_SPRING}
      style={{ position: 'fixed', inset: 0, zIndex: 10004, background: 'var(--surface-page)', color: 'var(--text)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, padding: 'calc(env(safe-area-inset-top) + 7px) 14px 8px', maxWidth: 760, width: '100%', margin: '0 auto' }}>
        {onClose ? <RkFab label={t('w3a.close')} onClick={requestClose}><RkIco d={RK_ICON.close} size={20} sw={2.2} /></RkFab> : <RkFabSpacer />}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'center' }}>
          <RkStatusPill dot={accent}>{sportLabel(sportType)}</RkStatusPill>
        </div>
        <RkFabSpacer />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 16px 24px', maxWidth: 760, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Héro : séance terminée + durée */}
        <div style={{ ...card, textAlign: 'center', padding: '20px 16px 18px' }}>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.01em' }}>{t('w3a.session_done')}</div>
          <div style={{ fontSize: 14, color: T.muted, marginTop: 2, textTransform: 'capitalize' }}>{date}</div>
          <div className="rk-num" style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.05, marginTop: 12 }}>{fmtClock(durationSec)}</div>
          <div className="rk-label" style={{ marginTop: 2 }}>{t('w3a.kpi_temps')}</div>
        </div>

        {/* Indicateurs */}
        <div className="rk-card">
          <RkGrid>
            {kpis.map(k => <RkCell key={k.label} label={k.label} value={k.value} unit={k.unit} size={30} />)}
          </RkGrid>
        </div>

        {/* Graphique cible + FC */}
        {(target || hr.samples.length > 1) && (
          <div style={{ ...card, padding: 16 }}>
            <div className="rk-label" style={{ marginBottom: 12 }}>{t('w3a.intensity')}</div>
            <SessionChart target={target} hr={hr} accent={accent} T={T} t={t} />
            {!hr.samples.length && (
              <p style={{ fontSize: 13, color: T.faint, margin: '10px 0 0' }}>{t('w3a.targets_note')}</p>
            )}
          </div>
        )}

        {/* Exos réalisés */}
        {doneList.length > 0 && (
          <div style={{ ...card, padding: '16px 16px 6px' }}>
            <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 6 }}>{t('w3a.what_done')}</div>
            {doneList.map((d, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: i === 0 ? 'none' : `1px solid ${T.listBorder}` }}>
                <span className="rk-num" style={{ width: 22, fontSize: 13, fontWeight: 800, color: T.faint, letterSpacing: 0 }}>{i + 1}</span>
                <span style={{ flex: 1, fontSize: 15, fontWeight: 700, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.label}</span>
                {d.detail && <span className="rk-num" style={{ fontSize: 13, fontWeight: 700, color: T.muted, flexShrink: 0, letterSpacing: 0 }}>{d.detail}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ flexShrink: 0, padding: '10px 16px calc(env(safe-area-inset-bottom) + 14px)', maxWidth: 760, width: '100%', margin: '0 auto' }}>
        <RkCta variant="primary" onClick={onNext}>
          {t('w3a.next')}
          <RkIco d={<path d="M5 12h14M13 6l6 6-6 6" />} size={18} sw={2.4} />
        </RkCta>
      </div>
    </motion.div>
  )
}

// ── Récap sortie GPS (après enregistrement) ──────────────────────────
function GpsRecap({ session, isDark, onClose, completedEfforts = [] }: GpsProps) {
  const { t } = useI18n()
  const reduce = useReducedMotion()
  const tokens = { bg: 'var(--surface-card)', text: 'var(--text)', dim: 'var(--text-mid)', separator: 'var(--border)' }
  const date = new Date(session.started_at).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  return (
    <motion.div className={rkScope(isDark)}
      initial={{ y: reduce ? 0 : '100%', opacity: reduce ? 0 : 1 }} animate={{ y: 0, opacity: 1 }}
      transition={reduce ? { duration: 0.15 } : RK_SPRING}
      style={{ position: 'fixed', inset: 0, zIndex: 10004, background: 'var(--surface-page)', color: 'var(--text)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, padding: 'calc(env(safe-area-inset-top) + 7px) 14px 8px' }}>
        <RkFab label={t('w3a.close')} onClick={onClose}><RkIco d={RK_ICON.close} size={20} sw={2.2} /></RkFab>
        <div style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
          <div style={{ fontSize: 19, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{session.title || t('w3a.session_done')}</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-mid)', textTransform: 'capitalize' }}>{date}</div>
        </div>
        <RkFabSpacer />
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: 12 }}>
        <SessionSummaryPage1 session={session} theme={tokens} isDark={isDark} dataFontFamily="var(--font-body)" />
        <SessionSummaryPage2 session={session} theme={tokens} dataFontFamily="var(--font-body)" />
        {session.laps.length > 0 && (
          <div style={{ margin: '12px 16px 0', background: 'var(--surface-card)', borderRadius: 'var(--r-lg)', padding: '14px 16px 4px' }}>
            <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 4 }}>{t('w2c.lap')}</div>
            {session.laps.map((l, i) => (
              <div key={l.number} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}>
                <span className="rk-num" style={{ width: 24, fontSize: 13, fontWeight: 800, color: 'var(--text-dim)', letterSpacing: 0 }}>{l.number}</span>
                <span className="rk-num" style={{ flex: 1, fontSize: 15, fontWeight: 700, letterSpacing: 0 }}>{(l.distance / 1000).toFixed(2)} km</span>
                <span className="rk-num" style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-mid)', letterSpacing: 0 }}>{fmtClock(l.duration)}</span>
              </div>
            ))}
          </div>
        )}
        {completedEfforts.length > 0 && (
          <div style={{ margin: '12px 16px 0', background: 'var(--surface-card)', borderRadius: 'var(--r-lg)', padding: '14px 16px 4px' }}>
            <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 4 }}>{t('rec.segments')}</div>
            {completedEfforts.map((e, i) => (
              <div key={`${e.segmentId}-${e.startedAt}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}>
                <span className="rk-dot" style={{ background: 'var(--primary)' }} />
                <span style={{ flex: 1, fontSize: 15, fontWeight: 700, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.segmentName}</span>
                <span className="rk-num" style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-mid)', letterSpacing: 0 }}>{fmtClock(e.durationSeconds)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ flexShrink: 0, padding: '10px 16px calc(env(safe-area-inset-bottom) + 14px)' }}>
        <RkCta variant="primary" onClick={onClose}>{t('rec.done')}</RkCta>
      </div>
    </motion.div>
  )
}
