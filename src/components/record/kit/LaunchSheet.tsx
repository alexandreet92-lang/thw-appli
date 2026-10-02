'use client'
// ════════════════════════════════════════════════════════════════════
// LaunchSheet — lanceur commun (muscu, Hyrox, boxe, hybride, rameur, home
// trainer) : 3 sections « Training Planning » (cette semaine) · « Training
// Session » (toutes les séances du sport) · « No Training » (lancer sans
// programme). Feuille premium RecordKit (glisser pour fermer), listes
// groupées iOS, tuile jour teintée de la couleur du sport, squelettes au
// chargement (jamais de spinner). Présentation pure.
// ════════════════════════════════════════════════════════════════════
import type { ReactNode } from 'react'
import { RkSheet, RkSectionLabel, RkGroup, RkRow, RkTile, RkCta, RkIco, RK_ICON } from './RecordKit'

export interface LaunchItem { id: string; title: string; sub?: string; day?: string; onPick: () => void }

export default function LaunchSheet({ open, onClose, title, sub, color, loading, week, all, weekEmpty, allEmpty, freeLabel, onFree, guide, zIndex = 10000 }: {
  open: boolean; onClose: () => void; title: string; sub?: string; color: string; loading?: boolean
  week: LaunchItem[]; all: LaunchItem[]; weekEmpty: ReactNode; allEmpty?: ReactNode
  freeLabel: string; onFree: () => void; guide?: string; zIndex?: number
}) {
  const row = (it: LaunchItem) => (
    <RkRow key={it.id}
      icon={<RkTile color={color}><span style={{ fontSize: 13, fontWeight: 800 }}>{it.day ?? '·'}</span></RkTile>}
      label={it.title} sub={it.sub} onClick={it.onPick} />
  )
  return (
    <RkSheet open={open} onClose={onClose} title={title} sub={sub} zIndex={zIndex}
      footer={
        <div data-guide={guide}>
          <RkCta variant="primary" onClick={onFree}>
            <RkIco d={RK_ICON.play} size={18} fill="currentColor" sw={0} />
            {freeLabel}
          </RkCta>
        </div>
      }>
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 8 }} aria-hidden>
          {[0, 1, 2].map(i => <div key={i} style={{ height: 64, borderRadius: 'var(--r-lg)', background: 'var(--surface-card)', animation: 'rkSkel 1.4s ease-in-out infinite' }} />)}
          <style>{'@keyframes rkSkel{0%,100%{opacity:.55}50%{opacity:1}}@media (prefers-reduced-motion: reduce){[style*="rkSkel"]{animation:none!important}}'}</style>
        </div>
      ) : (
        <>
          <RkSectionLabel>Training Planning</RkSectionLabel>
          {week.length === 0
            ? <p style={{ fontSize: 14, color: 'var(--text-mid)', margin: 0, padding: '2px 4px 6px', lineHeight: 1.5 }}>{weekEmpty}</p>
            : <RkGroup>{week.map(row)}</RkGroup>}
          {(all.length > 0 || allEmpty) && (
            <>
              <RkSectionLabel>Training Session</RkSectionLabel>
              {all.length === 0
                ? <p style={{ fontSize: 14, color: 'var(--text-mid)', margin: 0, padding: '2px 4px 6px', lineHeight: 1.5 }}>{allEmpty}</p>
                : <RkGroup>{all.map(row)}</RkGroup>}
            </>
          )}
          <div style={{ height: 8 }} />
        </>
      )}
    </RkSheet>
  )
}
