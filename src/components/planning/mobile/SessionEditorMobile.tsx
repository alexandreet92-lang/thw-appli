'use client'
// ══════════════════════════════════════════════════════════════════
// SessionEditor — feuille MOBILE « éditorial clair » (sports endurance).
// Coquille : backdrop + sheet + header (§2) + corps (MainFields §3/§4 +
// SessionBlockBuilder §5) + footer (§6). Masque la MobileTabBar (§0).
// Aucune logique métier ici : tout l'état/handlers viennent du parent
// (SessionEditor) — SM/SN, sauvegarde et plan A/B restent inchangés.
// ══════════════════════════════════════════════════════════════════
import { useEffect } from 'react'
import { IconChevronLeft, IconFileText, IconStar } from '@tabler/icons-react'
import { type SportType, type CyclingSub, type PlanVariant, type Block, SPORT_LABEL } from '@/app/planning/page'
import { EDITORIAL_CSS, PLAN_COLOR, type AthleteRefs } from './editorial'
import { MainFields } from './MainFields'
import { SessionBlockBuilder } from './SessionBlockBuilder'
import type { MBlock } from './blocks'

export interface SessionEditorMobileProps {
  mode: 'create' | 'edit'
  sport: SportType; accent: string; onSportChange: (s: SportType) => void
  cyclingSub: CyclingSub; setCyclingSub: (s: CyclingSub) => void
  trainingTypes: string[]; setTrainingTypes: (t: string[]) => void
  title: string; setTitle: (v: string) => void
  date: string; setDate: (v: string) => void; time: string; setTime: (v: string) => void
  dur: number; setDur: (n: number) => void
  rpe: number; setRpe: (n: number) => void
  desc: string; setDesc: (v: string) => void
  selPlan: PlanVariant
  blocks: Block[]; setBlocks: (b: Block[]) => void
  sm: number; sn: number
  athlete: { ftp: number | null; lthrBike: number | null; lthrRun: number | null; runThresholdPaceStr: string | null; swimCSSStr: string | null; hrMax: number | null } | null
  refs: AthleteRefs
  builderTab: 'manual' | 'ai'; setBuilderTab: (t: 'manual' | 'ai') => void
  saving: boolean; saved: boolean
  onClose: () => void; onSave: () => void; onExportPDF: () => void; onFavorite: () => void
}

export function SessionEditorMobile(p: SessionEditorMobileProps) {
  // §0 — masque la barre d'onglets tant que la feuille est montée
  useEffect(() => {
    document.body.classList.add('se-mobile-open')
    return () => document.body.classList.remove('se-mobile-open')
  }, [])

  const blocks = p.blocks as MBlock[]
  const planCol = p.selPlan === 'A' ? PLAN_COLOR.A : PLAN_COLOR.B

  return (
    <>
      <style>{EDITORIAL_CSS}</style>
      <div className="se-m" onClick={e => e.stopPropagation()} style={{
        position: 'fixed', inset: 0, zIndex: 999,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        animation: 'seSheetUp .32s cubic-bezier(.2,.8,.2,1) forwards',
      }}>
        {/* §2 — Header (un seul titre, fond translucide, pas de bloc blanc) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 'calc(8px + env(safe-area-inset-top)) 16px 12px', flexShrink: 0, background: 'var(--se-bg)' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: p.accent, flexShrink: 0 }}>{SPORT_LABEL[p.sport]}</span>
          <input value={p.title} onChange={e => p.setTitle(e.target.value)} placeholder={`${SPORT_LABEL[p.sport]} ${p.trainingTypes.join('+')}`}
            className="se-fr" style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', outline: 'none', color: 'var(--se-text)', fontSize: 21, fontWeight: 600, padding: 0 }} />
          <span style={{ flexShrink: 0, fontSize: 11.5, fontWeight: 700, color: planCol, border: `1px solid ${planCol}`, borderRadius: 999, padding: '3px 11px' }}>Plan {p.selPlan}</span>
          <button type="button" onClick={p.onClose} style={{ flexShrink: 0, width: 30, height: 30, borderRadius: '50%', border: '1px solid var(--se-rule)', background: 'transparent', color: 'var(--se-dim)', fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        {/* Corps scrollable — padding bas pour dégager les boutons flottants */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 96px', WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'] }}>
          <MainFields
            sport={p.sport} accent={p.accent} onSportChange={p.onSportChange}
            cyclingSub={p.cyclingSub} setCyclingSub={p.setCyclingSub}
            trainingTypes={p.trainingTypes} setTrainingTypes={p.setTrainingTypes}
            date={p.date} setDate={p.setDate} time={p.time} setTime={p.setTime}
            dur={p.dur} setDur={p.setDur} rpe={p.rpe} setRpe={p.setRpe}
            desc={p.desc} setDesc={p.setDesc}
            athlete={p.athlete}
          />

          <div style={{ height: 1, background: 'var(--se-rule)', margin: '24px 0' }} />

          {/* §5 — Builder de blocs */}
          <SessionBlockBuilder
            sport={p.sport} accent={p.accent} blocks={blocks}
            onChange={b => p.setBlocks(b as Block[])}
            sm={p.sm} sn={p.sn} refs={p.refs}
            builderTab={p.builderTab} onBuilderTab={p.setBuilderTab}
          />
        </div>

        {/* §6 — Footer flottant : boutons qui survolent le contenu (pas de barre blanche) */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', paddingBottom: 'calc(14px + env(safe-area-inset-bottom))', pointerEvents: 'none' }}>
          <button type="button" onClick={p.onClose} style={footBtn}><IconChevronLeft size={15} /> Fermer</button>
          <button type="button" onClick={p.onExportPDF} style={footIcon} aria-label="Exporter en PDF"><IconFileText size={17} /></button>
          <button type="button" onClick={p.onFavorite} style={footIcon} aria-label="Enregistrer en favori"><IconStar size={17} /></button>
          <div style={{ flex: 1 }} />
          <button type="button" onClick={p.onSave} disabled={p.saving} style={{ pointerEvents: 'auto', padding: '12px 24px', borderRadius: 999, border: 'none', background: p.accent, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: p.saving ? 0.6 : 1, boxShadow: '0 4px 16px rgba(0,0,0,0.18)' }}>
            {p.saved ? 'Enregistré ✓' : p.mode === 'create' ? 'Ajouter' : 'Enregistrer'} →
          </button>
        </div>
      </div>
    </>
  )
}

const footBtn: React.CSSProperties = { pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 4, padding: '10px 15px', borderRadius: 999, border: '1px solid var(--se-rule)', background: 'var(--se-card)', color: 'var(--se-text)', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 10px rgba(0,0,0,0.10)' }
const footIcon: React.CSSProperties = { pointerEvents: 'auto', width: 40, height: 40, borderRadius: '50%', border: '1px solid var(--se-rule)', background: 'var(--se-card)', color: 'var(--se-text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.10)' }
