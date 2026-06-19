'use client'
// ══════════════════════════════════════════════════════════════════
// SessionEditor — coquille DESKTOP (≥ 1024px) : modale centrée deux colonnes.
// RÉUTILISE exactement les composants éditoriaux du mobile (MainFields +
// BuilderSection + header/footer). Seule la MISE EN PAGE change : grille
// 370px / 1fr, chaque colonne scrolle, header & footer sticky. Aucune
// logique métier ni builder dupliqué.
// ══════════════════════════════════════════════════════════════════
import { EDITORIAL_CSS } from './editorial'
import { MainFields } from './MainFields'
import { BuilderSection } from './BuilderSection'
import { PanelHeader, PanelFooter } from './PanelChrome'
import type { SessionEditorPanelProps } from './panelProps'

export function SessionEditorDesktop(p: SessionEditorPanelProps) {
  return (
    <>
      <style>{EDITORIAL_CSS}</style>
      {/* Overlay assombri au-dessus de toute la nav desktop, centre la modale */}
      <div onClick={p.onClose} style={{
        position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2vh 2vw',
      }}>
      {/* Modale centrée */}
      <div className="se-d" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()} style={{
        width: 'min(1200px, 94vw)', height: 'min(90vh, 920px)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        borderRadius: 18, boxShadow: '0 24px 80px rgba(0,0,0,0.32)',
        animation: 'seModalIn .22s cubic-bezier(.2,.8,.2,1) forwards',
      }}>
        <PanelHeader p={p} titleSize={23} padding="16px 24px" />

        {/* Corps : deux colonnes, chacune scrolle */}
        <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '370px 1fr' }}>
          {/* Gauche — Paramètres */}
          <div style={{ overflowY: 'auto', padding: '22px 22px 32px', borderRight: '1px solid var(--se-rule)' }}>
            <MainFields
              sport={p.sport} accent={p.accent} onSportChange={p.onSportChange}
              cyclingSub={p.cyclingSub} setCyclingSub={p.setCyclingSub}
              brickRun={p.brickRun} setBrickRun={p.setBrickRun}
              trainingTypes={p.trainingTypes} setTrainingTypes={p.setTrainingTypes}
              date={p.date} setDate={p.setDate} time={p.time} setTime={p.setTime}
              dur={p.dur} setDur={p.setDur} rpe={p.rpe} setRpe={p.setRpe}
              desc={p.desc} setDesc={p.setDesc}
              athlete={p.athlete}
            />
          </div>
          {/* Droite — Construction de la séance */}
          <div style={{ overflowY: 'auto', padding: '22px 24px 32px' }}>
            <BuilderSection p={p} />
          </div>
        </div>

        <PanelFooter p={p} />
      </div>
      </div>
    </>
  )
}
