'use client'
// ══════════════════════════════════════════════════════════════════
// SessionEditor — coquille MOBILE « cartes » (< breakpoint desktop).
// Plein écran sur page grise : barre de boutons ronds flottants, corps
// scrollable (titre + MainFieldsMobile + BuilderSection) et pied flottant.
// Le contexte SeMobileProvider active le look cartes dans les builders
// partagés (le desktop et les autres usages restent inchangés).
// Masque la MobileTabBar (§0). Aucune logique métier ici.
// ══════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { EDITORIAL_CSS } from './editorial'
import { MainFieldsMobile } from './MainFieldsMobile'
import { BuilderSection } from './BuilderSection'
import { MobileHeaderBar, MobileTitle, MobileFooter, MOBILE_FOOTER_SPACE } from './MobileChrome'
import { SeMobileProvider, SEM_CSS } from './mobileKit'
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
    <SeMobileProvider>
      <style>{EDITORIAL_CSS}</style>
      <style>{SEM_CSS}</style>
      <div className="se-m" onClick={e => e.stopPropagation()} style={{
        position: 'fixed', inset: 0, zIndex: 999,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        background: 'var(--surface-page)',
        transform: shown ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform .32s cubic-bezier(.2,.8,.2,1)',
      }}>
        <MobileHeaderBar p={pc} />

        {/* Corps scrollable — padding bas ≥ hauteur du pied flottant + safe-area */}
        <div style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', padding: `0 16px ${MOBILE_FOOTER_SPACE}`, WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'] }}>
          <div style={{ marginBottom: 12 }}><MobileTitle p={pc} /></div>
          <MainFieldsMobile
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
          <div style={{ height: 12 }} />
          <BuilderSection p={p} />
        </div>

        <MobileFooter p={pc} />
      </div>
    </SeMobileProvider>
  )
}
