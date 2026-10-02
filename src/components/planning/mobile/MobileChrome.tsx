'use client'
// ══════════════════════════════════════════════════════════════════
// Chrome du SessionEditor MOBILE (maquette mock7) :
//  • barre haute : boutons ronds flottants — ✕ fermer · pilule centrale
//    « ● Sport · Plan A » · Dupliquer (popover existant) · ⋯ (Mémo…) ;
//  • titre éditable 26 px / 800 (multi-ligne, dans le défilement) ;
//  • pied flottant sur dégradé couleur de page : fiche PDF · favori ·
//    supprimer (rouge) + pilule cyan « Enregistrer ».
// Aucune logique métier : uniquement les handlers reçus du parent.
// ══════════════════════════════════════════════════════════════════
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { IconX, IconCopy, IconDots, IconFileText, IconStar, IconTrash, IconPrinter } from '@tabler/icons-react'
import { SPORT_LABEL } from '@/app/planning/page'
import { DuplicatePopover } from './PanelChrome'
import { roundBtn } from './mobileKit'
import type { SessionEditorPanelProps } from './panelProps'
import { useI18n } from '@/lib/i18n'

// Hauteur réservée en bas du contenu pour ne JAMAIS passer sous le pied flottant
// (bouton 52 + marges 14/30 + safe-area).
export const MOBILE_FOOTER_SPACE = 'calc(120px + env(safe-area-inset-bottom))'

export function MobileHeaderBar({ p }: { p: SessionEditorPanelProps }) {
  const { t } = useI18n()
  const [dupOpen, setDupOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const sportLabel = SPORT_LABEL[p.sport]
  const pill = p.reserveMode ? sportLabel : `${sportLabel} · ${t('planning.planPrefix')} ${p.selPlan}`

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 'calc(6px + env(safe-area-inset-top)) 16px 8px', flexShrink: 0, background: 'var(--surface-page)', position: 'relative', zIndex: 4 }}>
      <button type="button" onClick={p.onClose} aria-label={t('planning.close')} title={t('planning.close')} style={roundBtn()}>
        <IconX size={19} stroke={2.2} />
      </button>

      {/* Pilule centrale : point couleur du sport + Sport · Plan */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'center' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, minWidth: 0, fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
          <span aria-hidden style={{ width: 8, height: 8, borderRadius: '50%', background: p.sportAccent, flexShrink: 0 }} />
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pill}</span>
        </span>
      </div>

      {p.onDuplicateRepeat && (
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button type="button" onClick={() => { setDupOpen(o => !o); setMenuOpen(false) }} aria-label={t('pch.duplicateSession')} title={t('pch.duplicateSession')}
            aria-expanded={dupOpen} style={roundBtn()}>
            <IconCopy size={18} stroke={2} />
          </button>
          {dupOpen && <DuplicatePopover top={52} accent={p.sportAccent} sport={p.sport} onApply={p.onDuplicateRepeat} onClose={() => setDupOpen(false)} />}
        </div>
      )}

      {/* ⋯ : actions secondaires (Mémo imprimable) */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <button data-guide="builder-memo" type="button" onClick={() => { setMenuOpen(o => !o); setDupOpen(false) }} aria-label={t('sem.moreActions')} title={t('sem.moreActions')}
          aria-haspopup="menu" aria-expanded={menuOpen} style={roundBtn()}>
          <IconDots size={20} stroke={2.4} />
        </button>
        {menuOpen && (
          <>
            <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
            <div role="menu" style={{ position: 'absolute', top: 52, right: 0, zIndex: 41, minWidth: 220, background: 'var(--surface-card)', borderRadius: 'var(--r-md)', boxShadow: 'var(--shadow-capsule)', padding: 6 }}>
              <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); p.onPrintMemo() }} style={menuItem}>
                <IconPrinter size={18} /> {t('sed.printMemo')}
              </button>
              <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); p.onExportPDF() }} style={menuItem}>
                <IconFileText size={18} /> {t('planning.exportPdf')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const menuItem: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10, width: '100%', minHeight: 44, padding: '0 12px',
  border: 'none', background: 'transparent', borderRadius: 'var(--r-sm)', color: 'var(--text)',
  fontSize: 15, fontWeight: 600, cursor: 'pointer', textAlign: 'left', whiteSpace: 'nowrap',
}

/** Titre de séance éditable — 26 px / 800, revient à la ligne (textarea auto-hauteur, sans saut de ligne). */
export function MobileTitle({ p }: { p: SessionEditorPanelProps }) {
  const ref = useRef<HTMLTextAreaElement | null>(null)
  const fit = () => { const el = ref.current; if (!el) return; el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px` }
  useLayoutEffect(fit, [p.title])
  useEffect(() => { window.addEventListener('resize', fit); return () => window.removeEventListener('resize', fit) }, [])
  return (
    <textarea ref={ref} rows={1} value={p.title}
      onChange={e => p.setTitle(e.target.value.replace(/[\r\n]+/g, ' '))}
      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLTextAreaElement).blur() } }}
      placeholder={`${SPORT_LABEL[p.sport]} ${p.trainingTypes.join('+')}`}
      enterKeyHint="done"
      style={{ display: 'block', width: '100%', boxSizing: 'border-box', resize: 'none', overflow: 'hidden', background: 'transparent', border: 'none', outline: 'none', padding: '6px 4px 4px', margin: 0, color: 'var(--text)', fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.15 }} />
  )
}

export function MobileFooter({ p }: { p: SessionEditorPanelProps }) {
  const { t } = useI18n()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const wrap: React.CSSProperties = {
    position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 3,
    padding: '14px 16px', paddingBottom: 'calc(14px + env(safe-area-inset-bottom))',
    display: 'flex', alignItems: 'center', gap: 8, pointerEvents: 'none',
    background: 'linear-gradient(to top, var(--surface-page) 62%, transparent)',
  }
  const saveLabel = p.saved ? t('planning.savedCheck') : (p.reserveMode || p.mode === 'edit') ? t('planning.save') : t('planning.add')

  if (confirmDelete && p.onDelete) {
    return (
      <div style={wrap}>
        <span style={{ pointerEvents: 'auto', flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, color: 'var(--text)', background: 'var(--float-bg)', boxShadow: 'var(--shadow-capsule)', borderRadius: 'var(--r-pill)', padding: '0 16px', minHeight: 50, display: 'flex', alignItems: 'center' }}>{t('planning.deleteSessionConfirm')}</span>
        <button type="button" onClick={() => setConfirmDelete(false)} style={{ ...roundBtn(50), width: 'auto', padding: '0 16px', borderRadius: 'var(--r-pill)', pointerEvents: 'auto', fontSize: 14, fontWeight: 700 }}>{t('planning.cancel')}</button>
        <button type="button" onClick={p.onDelete} style={{ pointerEvents: 'auto', minHeight: 50, padding: '0 18px', borderRadius: 'var(--r-pill)', border: 'none', background: 'var(--danger)', color: 'var(--on-primary)', fontSize: 14, fontWeight: 800, cursor: 'pointer', boxShadow: 'var(--shadow-capsule)' }}>{t('planning.delete')}</button>
      </div>
    )
  }

  return (
    <div style={wrap}>
      <button type="button" onClick={p.onExportPDF} aria-label={t('planning.exportPdf')} title={t('planning.exportPdf')} style={{ ...roundBtn(50), pointerEvents: 'auto' }}>
        <IconFileText size={21} stroke={2} />
      </button>
      {!p.reserveMode && (
        <button type="button" onClick={p.onFavorite} aria-label={t('planning.saveFavorite')} title={t('planning.saveFavorite')} style={{ ...roundBtn(50), pointerEvents: 'auto' }}>
          <IconStar size={21} stroke={2} />
        </button>
      )}
      {p.onDelete && (
        <button type="button" onClick={() => setConfirmDelete(true)} aria-label={t('planning.deleteSession')} title={t('planning.deleteSession')} style={{ ...roundBtn(50), pointerEvents: 'auto', color: 'var(--danger)' }}>
          <IconTrash size={21} stroke={2} />
        </button>
      )}
      <button data-guide="builder-add" type="button" onClick={p.onSave} disabled={p.saving}
        style={{ pointerEvents: 'auto', flex: 1, minWidth: 0, height: 52, borderRadius: 'var(--r-pill)', border: 'none', background: 'var(--primary)', color: 'var(--on-primary)', fontSize: 17, fontWeight: 800, cursor: p.saving ? 'default' : 'pointer', opacity: p.saving ? 0.6 : 1, boxShadow: 'var(--shadow-capsule)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', padding: '0 16px' }}>
        {saveLabel}
      </button>
    </div>
  )
}
