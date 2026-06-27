'use client'
// ══════════════════════════════════════════════════════════════════
// SessionEditor — coquille MOBILE « éditorial clair » (< breakpoint desktop).
// Plein écran : header + corps scrollable (MainFields + BuilderSection) +
// footer flottant. Masque la MobileTabBar (§0). Aucune logique métier ici.
// ══════════════════════════════════════════════════════════════════
import { useEffect } from 'react'
import { EDITORIAL_CSS } from './editorial'
import { MainFields } from './MainFields'
import { BuilderSection } from './BuilderSection'
import { PanelHeader, PanelFooter } from './PanelChrome'
import type { SessionEditorPanelProps } from './panelProps'

export type { SessionEditorPanelProps as SessionEditorMobileProps }

export function SessionEditorMobile(p: SessionEditorPanelProps) {
  // §0 — masque la barre d'onglets tant que la feuille est montée
  useEffect(() => {
    document.body.classList.add('se-mobile-open')
    return () => document.body.classList.remove('se-mobile-open')
  }, [])

  return (
    <>
      <style>{EDITORIAL_CSS}</style>
      <div className="se-m" onClick={e => e.stopPropagation()} style={{
        position: 'fixed', inset: 0, zIndex: 999,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        animation: 'seSheetUp .32s cubic-bezier(.2,.8,.2,1) forwards',
      }}>
        <PanelHeader p={p} padding={'calc(8px + env(safe-area-inset-top)) 16px 12px'} bordered={false} />

        {/* Corps scrollable — padding bas pour dégager les boutons flottants */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 96px', WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'] }}>
          <MainFields
            reserveMode={p.reserveMode}
            sport={p.sport} accent={p.accent} onSportChange={p.onSportChange}
            cyclingSub={p.cyclingSub} setCyclingSub={p.setCyclingSub}
            brickRun={p.brickRun} setBrickRun={p.setBrickRun}
            trainingTypes={p.trainingTypes} setTrainingTypes={p.setTrainingTypes}
            date={p.date} setDate={p.setDate} time={p.time} setTime={p.setTime}
            dur={p.dur} setDur={p.setDur} rpe={p.rpe} setRpe={p.setRpe}
            desc={p.desc} setDesc={p.setDesc}
            athlete={p.athlete}
          />
          <div style={{ height: 1, background: 'var(--se-rule)', margin: '24px 0' }} />
          <BuilderSection p={p} />
        </div>

        <PanelFooter p={p} floating />
      </div>
    </>
  )
}
