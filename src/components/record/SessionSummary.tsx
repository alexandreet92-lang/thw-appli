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
import { sportLabel } from '@/components/recovery/helpers'

export interface TargetSeries { pts: { t: number; v: number }[]; unit: string; kind: string }
export interface SummaryHr { avg: number | null; max: number | null; min: number | null; samples: number[] }

interface Props {
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

// Bleu CTA de l'app (identique au bouton « Enregistrer »).
const APP_BLUE = 'linear-gradient(135deg, #06B6D4, #2563EB)'
const HR_COLOR = '#ef4444'

function theme(isDark: boolean) {
  return {
    bg:         isDark ? '#0A0A0A' : '#F4F7F9',
    text:       isDark ? '#FFFFFF' : '#0A0A0A',
    muted:      isDark ? 'rgba(255,255,255,0.52)' : '#7A828B',
    faint:      isDark ? 'rgba(255,255,255,0.4)'  : '#A6ACB3',
    tileBg:     isDark ? 'rgba(255,255,255,0.05)' : '#FFFFFF',
    tileBorder: isDark ? 'rgba(255,255,255,0.09)' : '#E7ECF0',
    grid:       isDark ? 'rgba(255,255,255,0.08)' : 'rgba(16,24,40,0.07)',
    listBorder: isDark ? 'rgba(255,255,255,0.07)' : '#EEF1F4',
    shadow:     isDark ? 'none' : '0 1px 3px rgba(16,24,40,0.05)',
    fadeTo:     isDark ? '#0A0A0A' : '#F4F7F9',
    accentSoft: isDark ? 'rgba(37,99,235,0.16)' : 'rgba(37,99,235,0.10)',
    blue:       '#2563EB',
  }
}

function fmtClock(s: number): string {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`
}

// Graphique cible + FC mesurée (SVG, aucune lib).
function SessionChart({ target, hr, accent, T }: { target: TargetSeries | null; hr: SummaryHr; accent: string; T: ReturnType<typeof theme> }) {
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
        {hasTarget && <Legend c={accent} label={`Cible (${tUnit})`} T={T} />}
        {hasHr && <Legend c={HR_COLOR} label="FC mesurée" T={T} />}
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
        <span style={{ fontSize: 10, color: T.faint }}>0:00</span>
        <span style={{ fontSize: 10, color: T.faint }}>{hasTarget ? fmtClock(totalT) : ''}</span>
      </div>
    </div>
  )
}
function Legend({ c, label, T }: { c: string; label: string; T: ReturnType<typeof theme> }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: T.muted }}><span style={{ width: 9, height: 3, borderRadius: 2, background: c }} />{label}</span>
}

export default function SessionSummary({ sportType, startedAt, durationSec, doneList, sets, volumeKg, caloriesEst, doneCount, totalCount, unitLabel, hr, target, accent, isDark, onNext, onClose }: Props) {
  const T = theme(isDark)
  const date = new Date(startedAt).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  const kpis: { label: string; value: string; accent?: boolean }[] = [
    { label: 'Temps', value: fmtClock(durationSec), accent: true },
    { label: unitLabel, value: `${doneCount}/${totalCount}` },
  ]
  if (sets > 0) kpis.push({ label: 'Séries', value: String(sets) })
  if (volumeKg > 0) kpis.push({ label: 'Volume', value: `${Math.round(volumeKg)} kg` })
  if (caloriesEst > 0) kpis.push({ label: 'Calories', value: `${caloriesEst} kcal` })
  if (hr.avg != null) kpis.push({ label: 'FC moy', value: `${hr.avg}` })
  if (hr.max != null) kpis.push({ label: 'FC max', value: `${hr.max}` })

  const tile: React.CSSProperties = { background: T.tileBg, border: `1px solid ${T.tileBorder}`, borderRadius: 16, padding: '14px 16px', boxShadow: T.shadow }
  const label: React.CSSProperties = { fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.muted, margin: 0 }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10004, background: T.bg, color: T.text, display: 'flex', flexDirection: 'column', fontFamily: 'DM Sans, sans-serif', animation: 'sumUp 320ms cubic-bezier(0.16,1,0.3,1)', paddingTop: 'env(safe-area-inset-top)' }}>
      <style>{`@keyframes sumUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>

      {onClose && (
        <button onClick={onClose} aria-label="Fermer" style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top) + 12px)', left: 14, width: 38, height: 38, borderRadius: '50%', border: `1px solid ${T.tileBorder}`, background: T.tileBg, color: T.text, cursor: 'pointer', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, boxShadow: T.shadow }}>×</button>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '30px 20px 130px', maxWidth: 760, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 13px', borderRadius: 999, background: T.accentSoft, border: `1px solid ${T.blue}44`, marginBottom: 14 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: T.blue }} />
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: T.blue }}>{sportLabel(sportType)}</span>
          </div>
          <h1 style={{ fontFamily: 'Syne, DM Sans, sans-serif', fontSize: 30, fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.02em', color: T.text }}>Séance terminée 🎉</h1>
          <p style={{ fontSize: 13.5, color: T.muted, margin: 0, textTransform: 'capitalize' }}>{date}</p>
          <p style={{ fontFamily: 'Syne, DM Sans, sans-serif', fontSize: 'clamp(52px, 16vw, 84px)', fontWeight: 800, margin: '10px 0 0', lineHeight: 1, color: accent, fontVariantNumeric: 'tabular-nums' }}>{fmtClock(durationSec)}</p>
        </div>

        {/* KPI grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(96px, 1fr))', gap: 10, marginBottom: 22 }}>
          {kpis.map(k => (
            <div key={k.label} style={{ ...tile, textAlign: 'center' }}>
              <p className="tnum" style={{ fontSize: 22, fontWeight: 800, margin: 0, color: k.accent ? T.blue : T.text, fontVariantNumeric: 'tabular-nums' }}>{k.value}</p>
              <p style={{ ...label, marginTop: 4 }}>{k.label}</p>
            </div>
          ))}
        </div>

        {/* Graphique cible + FC */}
        {(target || hr.samples.length > 1) && (
          <div style={{ ...tile, marginBottom: 22 }}>
            <p style={{ ...label, marginBottom: 12 }}>Intensité de la séance</p>
            <SessionChart target={target} hr={hr} accent={accent} T={T} />
            {!hr.samples.length && (
              <p style={{ fontSize: 11.5, color: T.faint, margin: '10px 0 0' }}>Cibles programmées — connecte un capteur cardio pour superposer ta FC réelle.</p>
            )}
          </div>
        )}

        {/* Exos réalisés */}
        {doneList.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            <p style={{ ...label, marginBottom: 10 }}>Ce qui a été fait</p>
            <div style={{ background: T.tileBg, border: `1px solid ${T.tileBorder}`, borderRadius: 16, overflow: 'hidden', boxShadow: T.shadow }}>
              {doneList.map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 15px', borderTop: i === 0 ? 'none' : `1px solid ${T.listBorder}` }}>
                  <span className="tnum" style={{ width: 22, fontSize: 12, fontWeight: 800, color: T.faint }}>{i + 1}</span>
                  <span style={{ flex: 1, fontSize: 14.5, fontWeight: 700, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: T.text }}>{d.label}</span>
                  {d.detail && <span className="tnum" style={{ fontSize: 12.5, fontWeight: 700, color: T.blue, flexShrink: 0 }}>{d.detail}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bouton Suivant (bleu app) */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 20px', paddingBottom: 'max(env(safe-area-inset-bottom), 20px)', background: `linear-gradient(transparent, ${T.fadeTo} 45%)` }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <button onClick={onNext} style={{ width: '100%', height: 54, borderRadius: 16, border: 'none', background: APP_BLUE, color: '#fff', fontSize: 16, fontWeight: 800, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 20px rgba(37,99,235,0.32)' }}>
            Suivant
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </button>
        </div>
      </div>
    </div>
  )
}
