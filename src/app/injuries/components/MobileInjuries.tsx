'use client'
// ══════════════════════════════════════════════════════════════
// Blessures — flux MOBILE simplifié (maquettes validées).
// Deux onglets : « Actuelles » / « Historique ».
//  • Actuelles : gros bouton sombre « Déclarer une douleur » + une carte
//    propre par douleur active (tuile zone, nom, chip de statut, barre de
//    sévérité 0-10 vert→orange→rouge, sparkline SVG de la fluctuation + tendance,
//    « Depuis le … · N j », actions « Mettre à jour » / « Marquer guérie »).
//  • Historique : les douleurs guéries, chacune ouvre une fiche détail
//    (courbe de fluctuation pic→guérison, frise d'événements, origine, durée).
// Chaque « Mettre à jour » ajoute un point de sévérité daté (injury_logs) →
// la fluctuation est réelle, jamais inventée. Tokens uniquement.
// ══════════════════════════════════════════════════════════════

import { withLocalSaveFeedback } from '@/lib/ui/saveToast'
import { useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { IconTile } from '@/components/ai/mobile/MobileKit'
import { DetailSlide } from '@/components/ui/DetailSlide'
import { useDetailView } from '@/hooks/useDetailView'
import type { Injury, InjuryLog } from '../types'
import {
  severityPoints, currentSeverity, severityColor, painTrend, daysSince, type TrendDir, type SevPoint,
} from '../lib'
import { HistoryList, InjuryHistoryDetail } from './MobileInjuryHistory'
import { MBlock, MSheetFrame, SegTrack, SliderRow, SoftTextarea, PillButton, MTag, NUM, FB } from './mobileUi'

const TREND_COLOR: Record<TrendDir, string> = { down: 'var(--charge-low)', flat: 'var(--text-mid)', up: 'var(--charge-hard)' }
const TREND_KEY: Record<TrendDir, string> = { down: 'injuries.trendDown', flat: 'injuries.trendFlat', up: 'injuries.trendUp' }
const TREND_ARROW: Record<TrendDir, string> = { down: '↓', flat: '→', up: '↑' }

// ── Sparkline de sévérité (SVG brut, aucune lib) ───────────────────
function Sparkline({ pts, color }: { pts: SevPoint[]; color: string }) {
  const W = 240, H = 44, pad = 4, n = pts.length
  if (n < 2) return null
  const x = (i: number) => pad + (i / (n - 1)) * (W - pad * 2)
  const y = (v: number) => pad + (1 - Math.max(0, Math.min(10, v)) / 10) * (H - pad * 2)
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ')
  const area = `M${x(0).toFixed(1)},${(H - pad).toFixed(1)} ` + pts.map((p, i) => `L${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ') + ` L${x(n - 1).toFixed(1)},${(H - pad).toFixed(1)} Z`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden style={{ width: '100%', height: 44, display: 'block' }}>
      <path d={area} fill={color} opacity={0.12} />
      <path d={d} fill="none" stroke={color} strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={x(n - 1)} cy={y(pts[n - 1].v)} r={3} fill={color} />
    </svg>
  )
}

// ── Barre de sévérité 0-10 (dégradé vert→orange→rouge + repère) ────
function SeverityBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, (value / 10) * 100))
  return (
    <div style={{ position: 'relative', height: 8, borderRadius: 'var(--r-pill)', background: 'linear-gradient(90deg, var(--charge-low), var(--charge-mid), var(--charge-hard))' }}>
      <span aria-hidden style={{ position: 'absolute', top: '50%', left: `${pct}%`, width: 18, height: 18, borderRadius: '50%', background: 'var(--surface-card)', boxShadow: '0 1px 6px rgba(0,0,0,0.22)' /* design-allow-color — ombre du repère de jauge (maquette) */, transform: 'translate(-50%,-50%)' }} />
    </div>
  )
}

// ── Carte d'une douleur active ─────────────────────────────────────
function PainCard({ inj, logs, onOpen, onUpdate, onResolve }: {
  inj: Injury; logs: InjuryLog[]
  onOpen: (i: Injury) => void; onUpdate: (i: Injury) => void; onResolve: (id: string) => void
}) {
  const { t } = useI18n()
  const pts = severityPoints(logs, inj.id)
  const cur = currentSeverity(inj, logs)
  const col = severityColor(cur)
  const trend = painTrend(logs, inj.id)
  const improving = trend?.dir === 'down' || inj.evolution === 'ameliore'
  const chipColor = improving ? 'var(--charge-low)' : 'var(--primary)'
  const chipLabel = improving ? t('injc.chipImproving') : t('injc.chipActive')
  const side = inj.side && inj.side !== 'central' ? ` · ${inj.side}` : ''
  const since = `${t('injm.sinceDate', { date: new Date(inj.onset_date + 'T12:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'long' }) })} · ${daysSince(inj.onset_date)} ${t('injuries.dayUnit')}`

  return (
    <MBlock>
      {/* En-tête tappable → fiche complète (interconnexion obligatoire) */}
      <button type="button" onClick={() => onOpen(inj)}
        style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontFamily: FB }}>
        <IconTile color={col} size={44}>
          <span style={{ ...NUM, fontSize: 17, fontWeight: 800 }}>{inj.zone.slice(0, 1).toUpperCase()}</span>
        </IconTile>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 17, fontWeight: 800, color: 'var(--text)', textTransform: 'capitalize', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inj.zone}{side}</span>
          <span style={{ display: 'block', fontSize: 13, color: 'var(--text-mid)', marginTop: 1 }}>{since}</span>
        </span>
        <MTag color={chipColor}>{chipLabel}</MTag>
      </button>

      {/* Sévérité courante */}
      <div style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-mid)' }}>{t('injc.severity')}</span>
          <span style={{ ...NUM, fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>{cur}<span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-mid)', marginLeft: 2 }}>/10</span></span>
        </div>
        <SeverityBar value={cur} />
      </div>

      {/* Fluctuation + tendance */}
      {pts.length >= 2 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-mid)' }}>{t('injc.fluctuation')}</span>
            {trend && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 700, color: TREND_COLOR[trend.dir] }}>
                {TREND_ARROW[trend.dir]} {t(TREND_KEY[trend.dir])}
              </span>
            )}
          </div>
          <Sparkline pts={pts} color={col} />
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <PillButton onClick={() => onUpdate(inj)} style={{ minHeight: 48 }}>{t('injc.update')}</PillButton>
        <PillButton variant="white" onClick={() => void withLocalSaveFeedback(() => onResolve(inj.id))} style={{ minHeight: 48 }}>{t('injuries.markResolved')}</PillButton>
      </div>
    </MBlock>
  )
}

// ── Feuille « Mettre à jour » : un nouveau point de sévérité daté ──
function UpdateSheet({ inj, logs, onClose, onAddLog, onUpdate }: {
  inj: Injury; logs: InjuryLog[]
  onClose: () => void
  onAddLog: (log: Omit<InjuryLog, 'id'>) => void
  onUpdate: (id: string, patch: Partial<Injury>) => void
}) {
  const { t } = useI18n()
  const prev = currentSeverity(inj, logs)
  const [v, setV] = useState(prev)
  const [note, setNote] = useState('')

  function save() {
    const today = new Date().toISOString().slice(0, 10)
    onAddLog({ injury_id: inj.id, log_date: today, note: note.trim() || null, intensity_rest: null, intensity_effort: v })
    // Garde l'épisode cohérent (sévérité courante + sens d'évolution) sans
    // toucher à la catégorie déclarée. Sert au coach et à l'indice de risque.
    onUpdate(inj.id, { intensity_effort: v, evolution: v < prev ? 'ameliore' : v > prev ? 'aggrave' : 'stable' })
    onClose()
  }

  return (
    <MSheetFrame title={t('injc.updateTitle')} subtitle={inj.zone} onClose={onClose} closeLabel={t('injuries.close')}
      footer={<PillButton onClick={() => void withLocalSaveFeedback(save)}>{t('injuries.save')}</PillButton>}>
      <MBlock>
        <SliderRow label={t('injc.severity')} value={v} onChange={setV} color={severityColor(v)} />
      </MBlock>
      <MBlock>
        <SoftTextarea value={note} onChange={setNote} placeholder={t('injc.notePlaceholder')} ariaLabel={t('injc.notePlaceholder')} rows={3} />
      </MBlock>
    </MSheetFrame>
  )
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <MBlock>
      <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.01em' }}>{title}</p>
      <p style={{ margin: '6px 0 0', fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.45 }}>{body}</p>
    </MBlock>
  )
}

export function MobileInjuries({ injuries, logs, onReport, onOpen, onAddLog, onUpdate, onResolve }: {
  injuries: Injury[]
  logs: InjuryLog[]
  onReport: () => void
  onOpen: (inj: Injury) => void
  onAddLog: (log: Omit<InjuryLog, 'id'>) => void
  onUpdate: (id: string, patch: Partial<Injury>) => void
  onResolve: (id: string) => void
}) {
  const { t } = useI18n()
  const [tab, setTab] = useState<'current' | 'history'>('current')
  const [detail, openDetail, closeDetail] = useDetailView<string>()
  const [updateId, setUpdateId] = useState<string | null>(null)

  const detailInj = detail ? injuries.find(i => i.id === detail) ?? null : null
  const updateInj = updateId ? injuries.find(i => i.id === updateId) ?? null : null

  // Fiche détail Historique (courbe + frise d'événements) : page qui glisse.
  if (detailInj) {
    return (
      <div style={{ padding: '14px 16px 24px', fontFamily: FB }}>
        <DetailSlide backLabel={t('injc.tabHistory')} onBack={closeDetail}>
          <InjuryHistoryDetail inj={detailInj} logs={logs} onOpen={onOpen} />
        </DetailSlide>
      </div>
    )
  }

  const active = injuries.filter(i => i.status === 'active').sort((a, b) => b.onset_date.localeCompare(a.onset_date))
  const resolved = injuries.filter(i => i.status === 'resolved')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '14px 16px 24px', fontFamily: FB }}>
      {/* Onglets Actuelles / Historique */}
      <SegTrack<'current' | 'history'> value={tab} onChange={setTab}
        options={[{ v: 'current', l: t('injc.tabCurrent') }, { v: 'history', l: t('injc.tabHistory') }]} />

      {tab === 'current' ? (
        <>
          <button type="button" onClick={onReport} data-guide="inj-declare" className="thw-press"
            style={{ width: '100%', minHeight: 54, borderRadius: 'var(--r-pill)', border: 'none', background: 'var(--text)', color: 'var(--bg)', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: FB }}>
            + {t('injc.declare')}
          </button>
          {active.length === 0
            ? <EmptyState title={t('injc.emptyCurrentTitle')} body={t('injc.emptyCurrentBody')} />
            : active.map(inj => (
              <PainCard key={inj.id} inj={inj} logs={logs} onOpen={onOpen} onUpdate={i => setUpdateId(i.id)} onResolve={onResolve} />
            ))}
        </>
      ) : (
        resolved.length === 0
          ? <EmptyState title={t('injc.emptyHistoryTitle')} body={t('injc.emptyHistoryBody')} />
          : <HistoryList injuries={resolved} all={injuries} onOpen={i => openDetail(i.id)} />
      )}

      {updateInj && <UpdateSheet inj={updateInj} logs={logs} onClose={() => setUpdateId(null)} onAddLog={onAddLog} onUpdate={onUpdate} />}
    </div>
  )
}
