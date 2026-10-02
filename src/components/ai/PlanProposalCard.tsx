'use client'

// ══════════════════════════════════════════════════════════════
// PlanProposalCard — aperçu d'un plan AVANT enregistrement.
//
// Le coach génère le plan (à partir des données réelles), le présente
// ici : phases de périodisation, volumes (début / fin / max), 2 premières
// semaines détaillées, logique. L'athlète valide → seulement alors le
// plan est écrit dans le Planning.
// ══════════════════════════════════════════════════════════════

import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useI18n } from '@/lib/i18n'
import { useIsMobile } from './mobile/MobileKit'
import { AimCard, AimLabel, AimPill, AimPress, AimSegBar, AimSkeleton, AimStat, AimStatGrid, AimTag, AIM_EASE } from './mobile/cards/kit'

export interface GenBloc {
  nom: string; type: string; semaine_debut: number; semaine_fin: number
  description?: string; volume_hebdo_h?: number
}
export interface GenSession {
  jour?: number; sport?: string; titre?: string; duree_min?: number
  tss?: number; intensite?: string; heure?: string; notes?: string; rpe?: number
  blocs?: { nom?: string; duree_min?: number; zone?: number; repetitions?: number; recup_min?: number; watts?: number | null; allure?: string | null; consigne?: string }[]
}
export interface GenWeek {
  numero?: number; type?: string; volume_h?: number; theme?: string
  note_coach?: string; seances?: GenSession[]
}
export interface GenProgram {
  nom?: string; objectif_principal?: string; duree_semaines?: number
  methodologie?: string
  blocs_periodisation?: GenBloc[]; semaines?: GenWeek[]
  conseils_adaptation?: string[]; points_cles?: string[]
}
export interface PlanRequirements {
  name?: string; objectif_principal?: string; sport_principal?: string
  niveau?: string; duree_semaines?: number; start_date?: string
  seances_par_semaine?: number; date_objectif?: string; type_competition?: string
  requirements_resume?: string; methode?: string; methodologie?: string
}
export interface PlanProposal {
  status: 'generating' | 'ready' | 'error' | 'validated'
  requirements: PlanRequirements
  program?: GenProgram
  error?: string
}

const weekVol = (w: GenWeek) => w.volume_h ?? Math.round((w.seances ?? []).reduce((a, s) => a + (s.duree_min ?? 0), 0) / 6) / 10

type PlanCardProps = { proposal: PlanProposal; onValidate: () => void; onCancel: () => void }

/** Aperçu de plan : carte « mock8 » sur mobile, rendu historique sur bureau. */
export function PlanProposalCard(props: PlanCardProps) {
  const mobile = useIsMobile()
  return mobile ? <PlanProposalMobile {...props} /> : <PlanProposalDesktop {...props} />
}

function PlanProposalDesktop({
  proposal,
  onValidate,
  onCancel,
}: PlanCardProps) {
  const { t } = useI18n()
  const DAYS = [t('ai.dayMon'), t('ai.dayTue'), t('ai.dayWed'), t('ai.dayThu'), t('ai.dayFri'), t('ai.daySat'), t('ai.daySun')]
  const SPORT_LABEL: Record<string, string> = { run: t('ai.sportRun'), bike: t('ai.sportBike'), swim: t('ai.sportSwim'), hyrox: 'Hyrox', rowing: t('ai.sportRowing'), gym: t('ai.sportGym') }
  const sportLabel = (s?: string) => SPORT_LABEL[(s ?? '').toLowerCase()] ?? (s ?? '')
  const [openWeek, setOpenWeek] = useState<number | null>(1)

  // ── États transitoires ──────────────────────────────────────
  if (proposal.status === 'generating') {
    return (
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={spinner} />
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--ai-text)' }}>{t('ai.buildingPlan')}</p>
            <p style={{ margin: '2px 0 0', fontSize: 11.5, color: 'var(--ai-dim)' }}>{t('ai.buildingPlanSub')}</p>
          </div>
        </div>
        <style>{`@keyframes pp_spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }
  if (proposal.status === 'error') {
    return (
      <div style={card}>
        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--danger)' }}>{proposal.error ?? t('ai.genFailed')}</p>
        <button onClick={onCancel} style={ghostBtn}>{t('ai.close')}</button>
      </div>
    )
  }

  const prog = proposal.program ?? {}
  const weeks = prog.semaines ?? []
  const blocs = prog.blocs_periodisation ?? []
  const vols = weeks.map(weekVol).filter(v => v > 0)
  const vStart = vols[0]
  const vEnd = vols[vols.length - 1]
  const vMax = vols.length ? Math.max(...vols) : undefined
  const previewWeeks = weeks.filter(w => (w.numero ?? 99) <= 2)
  const validated = proposal.status === 'validated'
  const sportDist = sportDistribution(weeks)

  return (
    <div style={card}>
      {/* Titre */}
      <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--ai-text)', fontFamily: 'var(--font-body)' }}>
        {prog.nom ?? proposal.requirements.name ?? t('ai.trainingPlan')}
      </p>
      {(prog.objectif_principal ?? proposal.requirements.objectif_principal) && (
        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--ai-mid)' }}>{prog.objectif_principal ?? proposal.requirements.objectif_principal}</p>
      )}

      {/* Analyse du coach (méthodologie) — directement sur l'interface, pas de sous-boîte */}
      {prog.methodologie && (
        <div style={{ marginTop: 12 }}>
          <p style={sectionTitle}>{t('ai.coachAnalysis')}</p>
          <RichText text={prog.methodologie} />
        </div>
      )}

      {/* Volumes */}
      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
        {[
          { l: t('ai.volStart'), v: vStart !== undefined ? `${vStart}h` : '—' },
          { l: t('ai.volEnd'), v: vEnd !== undefined ? `${vEnd}h` : '—' },
          { l: t('ai.volMaxPerWeek'), v: vMax !== undefined ? `${vMax}h` : '—' },
          { l: t('ai.duration'), v: `${prog.duree_semaines ?? weeks.length} ${t('ai.weeksUnit')}` },
        ].map(k => (
          <div key={k.l} style={kpi}>
            <p style={kpiL}>{k.l}</p>
            <p style={kpiV}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* Courbe de volume par semaine (colorée par phase) */}
      {weeks.length > 1 && (
        <div style={{ marginTop: 14 }}>
          <p style={sectionTitle}>{t('ai.volumePerWeek')}</p>
          <VolumeChart weeks={weeks} blocs={blocs} />
        </div>
      )}

      {/* Donut de répartition par sport */}
      {sportDist.length > 0 && (
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
          <SportDonut dist={sportDist} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={sectionTitle}>{t('ai.sportDistribution')}</p>
            {sportDist.map(d => {
              const total = sportDist.reduce((s, x) => s + x.min, 0) || 1
              return (
                <div key={d.sport} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4, fontSize: 12 }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, color: 'var(--ai-text)' }}>{sportLabel(d.sport)}</span>
                  <span style={{ color: 'var(--ai-dim)', fontFamily: 'var(--font-body)', fontSize: 11 }}>{Math.round(d.min / total * 100)}%</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Phases de périodisation */}
      {blocs.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <p style={sectionTitle}>{t('ai.phasesToGoal')}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {blocs.map((b, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                <span style={{ ...phaseDot, background: phaseColor(b.type) }} />
                <span style={{ fontWeight: 600, color: 'var(--ai-text)' }}>{b.nom}</span>
                <span style={{ color: 'var(--ai-dim)', fontFamily: 'var(--font-body)', fontSize: 11 }}>
                  S{b.semaine_debut}–{b.semaine_fin}{b.volume_hebdo_h ? ` · ${b.volume_hebdo_h}h` : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2 premières semaines détaillées */}
      {previewWeeks.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <p style={sectionTitle}>{t('ai.firstTwoWeeks')}</p>
          {previewWeeks.map(w => {
            const num = w.numero ?? 0
            const open = openWeek === num
            return (
              <div key={num} style={{ marginBottom: 10 }}>
                <button onClick={() => setOpenWeek(open ? null : num)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '7px 0', border: 'none', borderBottom: '1px solid var(--ai-border)', background: 'transparent', cursor: 'pointer' }}>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ai-text)', fontFamily: 'var(--font-body)' }}>{t('ai.weekN', { n: num })}{w.type ? ` · ${w.type}` : ''}</span>
                  <span style={{ fontSize: 11, color: 'var(--ai-dim)' }}>{weekVol(w)}h · {t('ai.sessionsCount', { n: (w.seances ?? []).length })} {open ? '▾' : '▸'}</span>
                </button>
                {open && (
                  <div style={{ paddingTop: 7 }}>
                    {w.note_coach && <p style={{ margin: '0 0 9px', fontSize: 12, color: 'var(--ai-mid)', fontStyle: 'italic', lineHeight: 1.45 }}>{w.note_coach}</p>}
                    {(w.seances ?? []).map((s, j) => (
                      <div key={j} style={{ padding: '8px 0', borderTop: j ? '1px solid var(--ai-border)' : 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                          <span style={dayChip}>{DAYS[s.jour ?? 0]}</span>
                          <span style={{ fontWeight: 700, color: 'var(--ai-text)' }}>{s.titre}</span>
                          <span style={{ marginLeft: 'auto', color: 'var(--ai-dim)', fontSize: 11, fontFamily: 'var(--font-body)', flexShrink: 0 }}>
                            {sportLabel(s.sport)} · {s.duree_min}′
                          </span>
                        </div>
                        {(s.blocs ?? []).length > 0 && (
                          <div style={{ marginTop: 5, paddingLeft: 2 }}>
                            {(s.blocs ?? []).map((bl, k) => (
                              <div key={k} style={{ display: 'flex', gap: 7, margin: '2px 0', fontSize: 12, color: 'var(--ai-mid)', lineHeight: 1.45 }}>
                                <span style={{ color: '#3C90D5', flexShrink: 0 }}>•</span>
                                <span>{bl.nom}{bl.duree_min ? ` ${bl.duree_min}′` : ''}{bl.repetitions ? ` ×${bl.repetitions}` : ''}{bl.zone ? ` Z${bl.zone}` : ''}{bl.watts ? ` ${bl.watts}W` : ''}{bl.allure ? ` ${bl.allure}` : ''}{bl.consigne ? ` — ${bl.consigne}` : ''}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Logique / conseils */}
      {(prog.points_cles?.length || prog.conseils_adaptation?.length) ? (
        <div style={{ marginTop: 12 }}>
          <p style={sectionTitle}>{t('ai.theLogic')}</p>
          {(prog.points_cles ?? []).map((p, i) => (
            <p key={`k${i}`} style={bullet}>• {p}</p>
          ))}
          {(prog.conseils_adaptation ?? []).map((c, i) => (
            <p key={`c${i}`} style={{ ...bullet, color: 'var(--ai-mid)' }}>→ {c}</p>
          ))}
        </div>
      ) : null}

      {/* Actions */}
      {validated ? (
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, color: '#22c55e', fontSize: 12.5, fontWeight: 600 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
          {t('ai.addedToPlanning')}
        </div>
      ) : (
        <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
          <button onClick={onCancel} style={ghostBtn}>{t('ai.cancel')}</button>
          <button onClick={onValidate} style={primaryBtn}>
            {t('ai.validateAddToPlanning')}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 6 }}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </button>
        </div>
      )}
    </div>
  )
}

// ── Styles ──────────────────────────────────────────────────────
const card: React.CSSProperties = { marginTop: 6, padding: '2px 2px 4px' }
const sectionTitle: React.CSSProperties = { margin: '0 0 6px', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ai-dim)', fontFamily: 'var(--font-body)' }
const kpi: React.CSSProperties = { flex: 1, padding: '6px 3px', borderRadius: 'var(--r-sm)', border: '1px solid var(--ai-border)', background: 'var(--ai-bg2)', textAlign: 'center' }
const kpiL: React.CSSProperties = { margin: 0, fontSize: 10, color: 'var(--ai-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }
const kpiV: React.CSSProperties = { margin: '2px 0 0', fontSize: 13, fontWeight: 700, color: 'var(--ai-text)', fontFamily: 'var(--font-body)' }
const phaseDot: React.CSSProperties = { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 }
const dayChip: React.CSSProperties = { fontSize: 9.5, fontWeight: 700, color: 'var(--ai-mid)', background: 'var(--ai-bg2)', border: '1px solid var(--ai-border)', borderRadius: 'var(--r-sm)', padding: '2px 5px', minWidth: 30, textAlign: 'center' }
const weekHead: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '8px 10px', border: 'none', background: 'var(--ai-bg2)', cursor: 'pointer' }
const bullet: React.CSSProperties = { margin: '2px 0', fontSize: 12, color: 'var(--ai-text)', lineHeight: 1.4 }
const ghostBtn: React.CSSProperties = { padding: '9px 14px', borderRadius: 'var(--r-sm)', border: '1px solid var(--ai-border)', background: 'transparent', color: 'var(--ai-mid)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }
const primaryBtn: React.CSSProperties = { display: 'flex', alignItems: 'center', flex: 1, justifyContent: 'center', padding: '10px 16px', borderRadius: 'var(--r-sm)', border: 'none', background: '#3C90D5', color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)', boxShadow: '0 3px 10px rgba(60,144,213,0.34)' }
const spinner: React.CSSProperties = { width: 18, height: 18, borderRadius: '50%', border: '2.5px solid var(--ai-border)', borderTopColor: '#3C90D5', animation: 'pp_spin 0.7s linear infinite', flexShrink: 0 }

function phaseColor(type: string): string {
  const t = (type ?? '').toLowerCase()
  if (t.includes('base')) return '#22c55e'
  if (t.includes('intens')) return '#f97316'
  if (t.includes('spéc') || t.includes('spec')) return '#3C90D5'
  if (t.includes('deload') || t.includes('affût') || t.includes('affut')) return '#a855f7'
  if (t.includes('comp')) return '#ef4444'
  return '#9ca3af'
}

// ── Rendu texte riche (méthodologie) : sauts de ligne, puces, gras, sous-titres ──
function parseBold(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i} style={{ fontWeight: 700 }}>{part.slice(2, -2)}</strong>
      : <span key={i}>{part}</span>,
  )
}
function RichText({ text }: { text: string }) {
  const lines = text.split('\n')
  return (
    <div>
      {lines.map((ln, i) => {
        const t = ln.trim()
        if (!t) return <div key={i} style={{ height: 7 }} />
        // Puce
        if (/^[-*•]\s+/.test(t)) {
          return (
            <div key={i} style={{ display: 'flex', gap: 8, margin: '3px 0', fontSize: 13, lineHeight: 1.5, color: 'var(--ai-text)' }}>
              <span style={{ color: '#3C90D5', flexShrink: 0, fontWeight: 700 }}>•</span>
              <span style={{ flex: 1, minWidth: 0 }}>{parseBold(t.replace(/^[-*•]\s+/, ''))}</span>
            </div>
          )
        }
        // Sous-titre : ligne courte se terminant par ':' (ou ## markdown)
        if (t.startsWith('#')) {
          return <p key={i} style={{ margin: '10px 0 4px', fontSize: 14, fontWeight: 700, color: 'var(--ai-text)', fontFamily: 'var(--font-body)' }}>{t.replace(/^#+\s*/, '')}</p>
        }
        if (t.length <= 46 && /[:：]$/.test(t)) {
          return <p key={i} style={{ margin: '9px 0 3px', fontSize: 13, fontWeight: 700, color: 'var(--ai-text)', fontFamily: 'var(--font-body)' }}>{parseBold(t)}</p>
        }
        return <p key={i} style={{ margin: '0 0 5px', fontSize: 13, lineHeight: 1.55, color: 'var(--ai-text)' }}>{parseBold(t)}</p>
      })}
    </div>
  )
}

// ── Couleurs sport + agrégations ────────────────────────────────
const SPORT_COLOR: Record<string, string> = {
  run: '#22c55e', bike: '#3b82f6', swim: '#06b6d4', gym: '#f97316', hyrox: '#8b5cf6', rowing: '#14b8a6',
}
function sportDistribution(weeks: GenWeek[]): { sport: string; min: number; color: string }[] {
  const map = new Map<string, number>()
  for (const w of weeks) for (const s of (w.seances ?? [])) {
    const sp = (s.sport ?? '').toLowerCase()
    if (!sp) continue
    map.set(sp, (map.get(sp) ?? 0) + (s.duree_min ?? 0))
  }
  return [...map.entries()]
    .filter(([, m]) => m > 0)
    .map(([sport, min]) => ({ sport, min, color: SPORT_COLOR[sport] ?? '#9ca3af' }))
    .sort((a, b) => b.min - a.min)
}
function weekPhaseColor(numero: number, blocs: GenBloc[]): string {
  const b = blocs.find(x => numero >= x.semaine_debut && numero <= x.semaine_fin)
  return b ? phaseColor(b.type) : '#9ca3af'
}

// ── Courbe de volume par semaine (SVG raw) ──────────────────────
function VolumeChart({ weeks, blocs }: { weeks: GenWeek[]; blocs: GenBloc[] }) {
  const vols = weeks.map(weekVol)
  const max = Math.max(...vols, 1)
  const W = 300, H = 58, gap = 3
  const n = weeks.length
  const bw = n ? (W - gap * (n - 1)) / n : 0
  return (
    <svg viewBox={`0 0 ${W} ${H + 14}`} width="100%" style={{ display: 'block', overflow: 'visible' }} preserveAspectRatio="none">
      {weeks.map((w, i) => {
        const v = weekVol(w)
        const h = Math.max(2, (v / max) * H)
        const x = i * (bw + gap)
        const num = w.numero ?? i + 1
        return (
          <g key={i}>
            <rect x={x} y={H - h} width={bw} height={h} rx={1.5} fill={weekPhaseColor(num, blocs)} opacity={0.92} />
            {(n <= 14 || i % 2 === 0) && (
              <text x={x + bw / 2} y={H + 10} textAnchor="middle" fontSize="7" fill="var(--ai-dim)" fontFamily="var(--font-body)">{num}</text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

// ── Donut de répartition par sport (SVG raw) ────────────────────
function SportDonut({ dist }: { dist: { sport: string; min: number; color: string }[] }) {
  const total = dist.reduce((s, d) => s + d.min, 0) || 1
  const r = 27, sw = 11, C = 2 * Math.PI * r
  let off = 0
  return (
    <svg viewBox="0 0 72 72" width="72" height="72" style={{ flexShrink: 0 }}>
      <circle cx="36" cy="36" r={r} fill="none" stroke="var(--ai-border)" strokeWidth={sw} opacity={0.35} />
      <g transform="rotate(-90 36 36)">
        {dist.map((d, i) => {
          const dash = (d.min / total) * C
          const seg = (
            <circle key={i} cx="36" cy="36" r={r} fill="none" stroke={d.color} strokeWidth={sw}
              strokeDasharray={`${dash} ${C - dash}`} strokeDashoffset={-off} />
          )
          off += dash
          return seg
        })}
      </g>
      <text x="36" y="33" textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--ai-text)" fontFamily="var(--font-body)">{Math.round(total / 60)}h</text>
      <text x="36" y="44" textAnchor="middle" fontSize="6.5" fill="var(--ai-dim)">sem 1-2</text>
    </svg>
  )
}

// ══════════════════════════════════════════════════════════════
// MOBILE (≤ 767 px) — maquette validée « a1-plan » :
// tag · titre · 3 tuiles (début / pic / séances) · barres de volume
// hebdo (semaines allégées en gris) · barre de phases colorée + libellés ·
// semaines en lignes dépliables · Annuler (gris) / Ajouter au planning (cyan).
// ══════════════════════════════════════════════════════════════

/** Couleur de phase (mobile) — tokens sémantiques (DS §2.1). */
function phaseTint(type: string, nom?: string): string {
  const t = `${type ?? ''} ${nom ?? ''}`.toLowerCase()
  if (/aff[uû]t|taper|deload|compét|compet|course/.test(t)) return 'var(--danger)'
  if (/sp[ée]c/.test(t)) return 'var(--zone-4)'
  if (/r[ée]cup|transition/.test(t)) return 'var(--zone-1)'
  if (/base|fondation|g[ée]n[ée]ral/.test(t)) return 'color-mix(in srgb, var(--sport-bike) 50%, var(--surface-card))'
  return 'var(--success)'
}

/** « 6 h », « 6 h 30 », « 45 min ». */
function fmtHours(h: number): string {
  if (!isFinite(h) || h <= 0) return '—'
  const total = Math.round(h * 60)
  const hh = Math.floor(total / 60), mm = total % 60
  if (hh === 0) return `${mm} min`
  return mm ? `${hh} h ${String(mm).padStart(2, '0')}` : `${hh} h`
}

/** Semaine allégée (récup / affûtage) ou en net retrait → barre grise. */
function isLightWeek(w: GenWeek, prevVol: number | undefined): boolean {
  if (/r[ée]cup|d[ée]charge|deload|all[ée]g|assimil|aff[uû]t|taper|recovery/i.test(`${w.type ?? ''} ${w.theme ?? ''}`)) return true
  const v = weekVol(w)
  return prevVol !== undefined && prevVol > 0 && v < prevVol * 0.85
}

function WeeklyBars({ weeks }: { weeks: GenWeek[] }) {
  const reduce = useReducedMotion()
  const vols = weeks.map(weekVol)
  const max = Math.max(...vols, 0.1)
  const n = weeks.length
  const W = 326, H = 70, gap = n > 20 ? 3 : 5
  const bw = n ? (W - gap * (n - 1)) / n : 0
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" aria-hidden style={{ display: 'block', marginTop: 14, overflow: 'visible' }}>
      {weeks.map((w, i) => {
        const v = vols[i]
        const h = Math.max(4, (v / max) * H)
        const light = isLightWeek(w, i > 0 ? vols[i - 1] : undefined)
        return (
          <motion.rect
            key={i}
            x={i * (bw + gap)} y={H - h} width={bw} height={h} rx={Math.min(4, bw / 2)}
            fill={light ? 'var(--surface-bar)' : 'var(--primary)'}
            style={{ transformBox: 'fill-box', transformOrigin: '50% 100%' }}
            initial={reduce ? false : { scaleY: 0, opacity: 0 }}
            animate={{ scaleY: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: AIM_EASE, delay: 0.12 + i * 0.03 }}
          />
        )
      })}
    </svg>
  )
}

function WeekRow({ w, first, open, onToggle }: { w: GenWeek; first: boolean; open: boolean; onToggle: () => void }) {
  const { t } = useI18n()
  const reduce = useReducedMotion()
  const DAYS = [t('ai.dayMon'), t('ai.dayTue'), t('ai.dayWed'), t('ai.dayThu'), t('ai.dayFri'), t('ai.daySat'), t('ai.daySun')]
  const seances = w.seances ?? []
  const themes = w.theme ?? seances.map(s => s.titre).filter(Boolean).slice(0, 3).join(', ')
  const sub = [t('ai.sessionsCount', { n: seances.length }), fmtHours(weekVol(w)), themes].filter(x => x && x !== '—').join(' · ')
  return (
    <div style={{ borderTop: first ? 'none' : '1px solid var(--border)' }}>
      <AimPress onClick={onToggle} ariaLabel={t('ai.weekN', { n: w.numero ?? 0 })} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 58, padding: '10px 0' }}>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>{t('ai.weekN', { n: w.numero ?? 0 })}{w.type ? ` · ${w.type}` : ''}</span>
          <span style={{ display: 'block', fontSize: 13, color: 'var(--text-mid)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</span>
        </span>
        <motion.svg animate={{ rotate: open ? 90 : 0 }} transition={{ duration: reduce ? 0 : 0.28, ease: AIM_EASE }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-mid)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }} aria-hidden>
          <path d="m9 18 6-6-6-6" />
        </motion.svg>
      </AimPress>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={reduce ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4, transition: { duration: 0.15 } }}
            transition={{ duration: 0.32, ease: AIM_EASE }}
            style={{ paddingBottom: 10 }}
          >
            {w.note_coach && <p style={{ margin: '0 0 8px', fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.45 }}>{w.note_coach}</p>}
            <div className="aimc-tile" style={{ padding: '4px 12px' }}>
              {seances.map((s, j) => (
                <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderTop: j ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ width: 34, flexShrink: 0, fontSize: 12, fontWeight: 800, color: 'var(--text-mid)' }}>{DAYS[s.jour ?? 0]}</span>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.titre}</span>
                  <span className="aimc-num" style={{ flexShrink: 0, fontSize: 13, color: 'var(--text-mid)' }}>{s.duree_min ? `${s.duree_min} min` : ''}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function PlanProposalMobile({ proposal, onValidate, onCancel }: PlanCardProps) {
  const { t } = useI18n()
  const [openWeek, setOpenWeek] = useState<number | null>(null)
  const [allWeeks, setAllWeeks] = useState(false)
  const [showLogic, setShowLogic] = useState(false)

  if (proposal.status === 'generating') {
    return (
      <AimCard>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <AimTag>{t('ai2.plan.tag')}</AimTag>
          <AimSkeleton width={70} height={12} />
        </div>
        <p className="ai-shimmer" style={{ margin: '12px 0 0', fontSize: 18, fontWeight: 800 }}>{t('ai.buildingPlan')}</p>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-mid)' }}>{t('ai.buildingPlanSub')}</p>
        <AimStatGrid cols={3} style={{ marginTop: 12 }}>
          {[0, 1, 2].map(i => <AimSkeleton key={i} height={52} />)}
        </AimStatGrid>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 70, marginTop: 14 }}>
          {[38, 44, 50, 30, 54, 60, 66, 40, 70, 74, 80, 52, 66, 58, 46, 28].map((h, i) => (
            <AimSkeleton key={i} height={h * 0.8} style={{ flex: 1, borderRadius: 'var(--r-sm)', animationDelay: `${i * 60}ms` }} />
          ))}
        </div>
      </AimCard>
    )
  }
  if (proposal.status === 'error') {
    return (
      <AimCard>
        <p style={{ margin: 0, fontSize: 15, color: 'var(--text)', lineHeight: 1.45 }}>{proposal.error ?? t('ai.genFailed')}</p>
        <div style={{ display: 'flex', marginTop: 14 }}>
          <AimPill onClick={onCancel} flex={1}>{t('ai.close')}</AimPill>
        </div>
      </AimCard>
    )
  }

  const prog = proposal.program ?? {}
  const req = proposal.requirements
  const weeks = prog.semaines ?? []
  const blocs = prog.blocs_periodisation ?? []
  const vols = weeks.map(weekVol).filter(v => v > 0)
  const vStart = vols[0]
  const vMax = vols.length ? Math.max(...vols) : undefined
  const counts = weeks.map(w => (w.seances ?? []).length).filter(n => n > 0)
  const perWeek = req.seances_par_semaine ?? (counts.length ? Math.round(counts.reduce((a, b) => a + b, 0) / counts.length) : undefined)
  const nWeeks = prog.duree_semaines ?? weeks.length
  const validated = proposal.status === 'validated'
  const suffix = t('ai2.plan.perWeek')
  const shownWeeks = allWeeks ? weeks : weeks.slice(0, 2)
  const logic = [...(prog.points_cles ?? []), ...(prog.conseils_adaptation ?? [])]

  return (
    <AimCard>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <AimTag>{t('ai2.plan.tag')}</AimTag>
        {nWeeks > 0 && <span className="aimc-num" style={{ fontSize: 13, color: 'var(--text-mid)' }}>{t('ai2.plan.weeks', { n: nWeeks })}</span>}
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.25, letterSpacing: '-0.01em', marginTop: 10, color: 'var(--text)' }}>
        {prog.nom ?? req.name ?? t('ai.trainingPlan')}
      </div>
      {(prog.objectif_principal ?? req.objectif_principal) && (
        <div style={{ fontSize: 14, color: 'var(--text-mid)', marginTop: 4, lineHeight: 1.4 }}>{prog.objectif_principal ?? req.objectif_principal}</div>
      )}

      <AimStatGrid cols={3} style={{ marginTop: 12, gap: 8 }}>
        <AimStat label={t('ai2.plan.start')} value={vStart !== undefined ? `${Math.round(vStart * 10) / 10} h${suffix}` : '—'} />
        <AimStat label={t('ai2.plan.peak')} value={vMax !== undefined ? `${Math.round(vMax * 10) / 10} h${suffix}` : '—'} />
        <AimStat label={t('ai2.plan.sessions')} value={perWeek !== undefined ? `${perWeek}${suffix}` : '—'} />
      </AimStatGrid>

      {weeks.length > 1 && <WeeklyBars weeks={weeks} />}

      {blocs.length > 0 && (
        <>
          <AimSegBar
            height={8}
            style={{ marginTop: 10 }}
            segments={blocs.map((b, i) => ({ key: `${i}`, flex: Math.max(1, (b.semaine_fin ?? 0) - (b.semaine_debut ?? 0) + 1), color: phaseTint(b.type, b.nom) }))}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, marginTop: 5, fontSize: 12, color: 'var(--text-mid)' }}>
            {blocs.map((b, i) => (
              <span key={i} style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.nom}</span>
            ))}
          </div>
        </>
      )}

      {shownWeeks.length > 0 && (
        <div style={{ marginTop: 12, borderTop: '1px solid var(--border)' }}>
          {shownWeeks.map((w, i) => {
            const num = w.numero ?? i + 1
            return <WeekRow key={num} w={w} first={i === 0} open={openWeek === num} onToggle={() => setOpenWeek(o => (o === num ? null : num))} />
          })}
          {weeks.length > 2 && (
            <AimPress onClick={() => setAllWeeks(a => !a)} style={{ width: '100%', minHeight: 44, borderTop: '1px solid var(--border)', fontSize: 14, fontWeight: 700, color: 'var(--primary)' }}>
              {allWeeks ? t('ai2.plan.lessWeeks') : t('ai2.plan.allWeeks', { n: weeks.length })}
            </AimPress>
          )}
        </div>
      )}

      {(prog.methodologie || logic.length > 0) && (
        <div style={{ borderTop: '1px solid var(--border)' }}>
          <AimPress onClick={() => setShowLogic(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 50 }}>
            <span style={{ flex: 1, fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>{t('ai.coachAnalysis')}</span>
            <motion.svg animate={{ rotate: showLogic ? 90 : 0 }} transition={{ duration: 0.28, ease: AIM_EASE }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-mid)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m9 18 6-6-6-6" />
            </motion.svg>
          </AimPress>
          <AnimatePresence initial={false}>
            {showLogic && (
              <motion.div key="logic" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.15 } }} transition={{ duration: 0.32, ease: AIM_EASE }} style={{ paddingBottom: 6 }}>
                {prog.methodologie && <RichText text={prog.methodologie} />}
                {logic.length > 0 && (
                  <>
                    <AimLabel style={{ margin: '10px 0 4px' }}>{t('ai.theLogic')}</AimLabel>
                    {logic.map((p, i) => <p key={i} style={{ margin: '3px 0', fontSize: 14, lineHeight: 1.45, color: 'var(--text)' }}>• {p}</p>)}
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence mode="wait" initial={false}>
        {validated ? (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35, ease: AIM_EASE }}
            style={{ marginTop: 14, minHeight: 48, borderRadius: 'var(--r-pill)', background: 'color-mix(in srgb, var(--success) 14%, transparent)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 15, fontWeight: 800 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M20 6L9 17l-5-5" /></svg>
            {t('ai.addedToPlanning')}
          </motion.div>
        ) : (
          <motion.div key="acts" exit={{ opacity: 0, transition: { duration: 0.12 } }} style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <AimPill onClick={onCancel} flex={1}>{t('ai.cancel')}</AimPill>
            <AimPill variant="primary" onClick={onValidate} flex={2} hapticKind="success">{t('ai2.plan.add')}</AimPill>
          </motion.div>
        )}
      </AnimatePresence>
    </AimCard>
  )
}
