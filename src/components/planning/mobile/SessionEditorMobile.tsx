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
      <div onClick={p.onClose} style={{ position: 'fixed', inset: 0, zIndex: 998, background: 'rgba(0,0,0,0.40)', backdropFilter: 'blur(3px)' }} />
      <div className="se-m" onClick={e => e.stopPropagation()} style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, height: '97dvh', zIndex: 999,
        borderRadius: '22px 22px 0 0', boxShadow: '0 -8px 40px rgba(0,0,0,0.16)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        animation: 'seSheetUp .36s cubic-bezier(.2,.8,.2,1) forwards',
      }}>
        {/* Poignée */}
        <div style={{ width: 38, height: 4, borderRadius: 4, background: 'var(--se-rule)', margin: '10px auto 0', flexShrink: 0 }} />

        {/* §2 — Header (un seul titre) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px 14px', borderBottom: '1px solid var(--se-rule)', flexShrink: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: p.accent, flexShrink: 0 }}>{SPORT_LABEL[p.sport]}</span>
          <input value={p.title} onChange={e => p.setTitle(e.target.value)} placeholder={`${SPORT_LABEL[p.sport]} ${p.trainingTypes.join('+')}`}
            className="se-fr" style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', outline: 'none', color: 'var(--se-text)', fontSize: 21, fontWeight: 600, padding: 0 }} />
          <span style={{ flexShrink: 0, fontSize: 11.5, fontWeight: 700, color: planCol, border: `1px solid ${planCol}`, borderRadius: 999, padding: '3px 11px' }}>Plan {p.selPlan}</span>
          <button type="button" onClick={p.onClose} style={{ flexShrink: 0, width: 30, height: 30, borderRadius: '50%', border: '1px solid var(--se-rule)', background: 'transparent', color: 'var(--se-dim)', fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        {/* Corps scrollable */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px 28px', WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'] }}>
          <MainFields
            sport={p.sport} accent={p.accent} onSportChange={p.onSportChange}
            cyclingSub={p.cyclingSub} setCyclingSub={p.setCyclingSub}
            trainingTypes={p.trainingTypes} setTrainingTypes={p.setTrainingTypes}
            date={p.date} setDate={p.setDate} time={p.time} setTime={p.setTime}
            dur={p.dur} setDur={p.setDur} rpe={p.rpe} setRpe={p.setRpe}
            desc={p.desc} setDesc={p.setDesc}
            blocks={blocks} sm={p.sm} sn={p.sn} athlete={p.athlete}
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

        {/* §6 — Footer sticky */}
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom))', borderTop: '1px solid var(--se-rule)', background: 'var(--se-card)' }}>
          <button type="button" onClick={p.onClose} style={footBtn}><IconChevronLeft size={15} /> Fermer</button>
          <button type="button" onClick={p.onExportPDF} style={footIcon} aria-label="Exporter en PDF"><IconFileText size={17} /></button>
          <button type="button" onClick={p.onFavorite} style={footIcon} aria-label="Enregistrer en favori"><IconStar size={17} /></button>
          <div style={{ flex: 1 }} />
          <button type="button" onClick={p.onSave} disabled={p.saving} style={{ padding: '11px 22px', borderRadius: 999, border: 'none', background: p.accent, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: p.saving ? 0.6 : 1 }}>
            {p.saved ? 'Enregistré ✓' : p.mode === 'create' ? 'Ajouter' : 'Enregistrer'} →
          </button>
        </div>
      </div>
    </>
  )
}

const footBtn: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 4, padding: '9px 14px', borderRadius: 999, border: '1px solid var(--se-rule)', background: 'transparent', color: 'var(--se-dim)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const footIcon: React.CSSProperties = { width: 38, height: 38, borderRadius: '50%', border: '1px solid var(--se-rule)', background: 'transparent', color: 'var(--se-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }
