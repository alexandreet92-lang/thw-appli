'use client'
// ══════════════════════════════════════════════════════════════════
// SessionEditor — coquille MOBILE « éditorial clair » (< breakpoint desktop).
// Plein écran : header + corps scrollable (MainFields + BuilderSection) +
// footer flottant. Masque la MobileTabBar (§0). Aucune logique métier ici.
// ══════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { EDITORIAL_CSS } from './editorial'
import { MainFields } from './MainFields'
import { BuilderSection } from './BuilderSection'
import { PanelHeader, PanelFooter } from './PanelChrome'
import type { SessionEditorPanelProps } from './panelProps'

export type { SessionEditorPanelProps as SessionEditorMobileProps }

export function SessionEditorMobile(p: SessionEditorPanelProps) {
  const [shown, setShown] = useState(false)
  // §0 — masque la barre d'onglets tant que la feuille est montée
  useEffect(() => {
    document.body.classList.add('se-mobile-open')
    return () => document.body.classList.remove('se-mobile-open')
  }, [])
  useEffect(() => { const r = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(r) }, [])
  const requestClose = () => { setShown(false); setTimeout(p.onClose, 320) }
  const pc = { ...p, onClose: requestClose }

  return (
    <>
      <style>{EDITORIAL_CSS}</style>
      <div className="se-m" onClick={e => e.stopPropagation()} style={{
        position: 'fixed', inset: 0, zIndex: 999,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        transform: shown ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform .32s cubic-bezier(.2,.8,.2,1)',
      }}>
        <PanelHeader p={pc} padding={'calc(8px + env(safe-area-inset-top)) 16px 12px'} bordered={false} stacked />

        {/* Corps scrollable — padding bas pour dégager les boutons flottants */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 96px', WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'] }}>
          <MainFields
            reserveMode={p.reserveMode}
            programMode={p.programMode}
            sport={p.sport} accent={p.accent} onSportChange={p.onSportChange} lockSport={p.lockSport}
            cyclingSub={p.cyclingSub} setCyclingSub={p.setCyclingSub}
            runningSub={p.runningSub} setRunningSub={p.setRunningSub}
            runFamily={p.runFamily} setRunFamily={p.setRunFamily}
            brickRun={p.brickRun} setBrickRun={p.setBrickRun} onBrickButton={p.onBrickButton}
            trainingTypes={p.trainingTypes} setTrainingTypes={p.setTrainingTypes}
            date={p.date} setDate={p.setDate} time={p.time} setTime={p.setTime}
            dur={p.dur} setDur={p.setDur} rpe={p.rpe} setRpe={p.setRpe}
            desc={p.desc} setDesc={p.setDesc}
            athlete={p.athlete}
          />
          <div style={{ height: 1, background: 'var(--se-rule)', margin: '24px 0' }} />
          <BuilderSection p={p} />
        </div>

        <PanelFooter p={pc} floating />
      </div>
    </>
  )
}
