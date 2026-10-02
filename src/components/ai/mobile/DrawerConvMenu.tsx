'use client'
// ══════════════════════════════════════════════════════════════════
// Menu contextuel « appui long » d'une conversation du tiroir IA (mobile),
// façon Claude iOS : tout l'arrière-plan est flouté/assombri, la ligne pressée
// remonte au premier plan (légère mise à l'échelle + ombre) et un menu en verre
// arrondi s'ouvre dessous (ou dessus s'il n'y a pas la place).
// Rendu via createPortal(document.body) pour passer au-dessus du panneau IA.
// Les couleurs viennent des tokens --aid-* déclarés par MobileHistoryDrawer.
// ══════════════════════════════════════════════════════════════════
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion, useReducedMotion } from 'motion/react'
import { Pin, PinOff, Pencil, Folder, Trash2, ChevronRight, ChevronLeft, Check, MessageCircle } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import type { AIProject } from '@/lib/ai/projects-sync'

/** Forme minimale d'une conversation affichée dans le tiroir. */
export interface DrawerConv {
  id: string
  title: string
  updatedAt: number
  isPinned?: boolean
  projectId?: string | null
}

/** Position écran de la ligne pressée (getBoundingClientRect). */
export interface LpRect { top: number; left: number; width: number; height: number }

type Screen = 'main' | 'projects' | 'confirm'

const EASE = [0.22, 1, 0.36, 1] as const
const GAP = 12        // espace ligne ↔ menu
const MARGIN_TOP = 48 // évite l'encoche / la barre d'état
const MARGIN_BOTTOM = 24

export function DrawerConvMenu({
  conv, rect, pinnedRow, projects, onPin, onRename, onMove, onDelete, onClose,
}: {
  conv: DrawerConv
  rect: LpRect
  pinnedRow: boolean
  projects: AIProject[]
  onPin: () => void
  onRename: () => void
  onMove: (projectId: string | null) => void
  onDelete: () => void
  onClose: () => void
}) {
  const { t } = useI18n()
  const reduce = useReducedMotion()
  const [screen, setScreen] = useState<Screen>('main')
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; above: boolean } | null>(null)
  const openedAt = useRef(Date.now())

  const vw = typeof window !== 'undefined' ? window.innerWidth : 390
  const vh = typeof window !== 'undefined' ? window.innerHeight : 844
  const menuW = Math.min(304, vw - 32)
  const menuLeft = Math.max(12, Math.min(rect.left + 6, vw - menuW - 12))
  const rowTop = Math.max(8, Math.min(rect.top, vh - rect.height - 8))

  // Placement : sous la ligne si possible, sinon au-dessus, sinon collé en bas.
  useLayoutEffect(() => {
    const el = menuRef.current
    if (!el) return
    const h = el.offsetHeight
    const below = rowTop + rect.height + GAP
    if (below + h <= vh - MARGIN_BOTTOM) { setPos({ top: below, above: false }); return }
    const above = rowTop - GAP - h
    if (above >= MARGIN_TOP) { setPos({ top: above, above: true }); return }
    setPos({ top: Math.max(MARGIN_TOP, vh - MARGIN_BOTTOM - h), above: false })
  }, [screen, rowTop, rect.height, vh, projects.length])

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  // Tap à l'extérieur → ferme (on ignore le relâché du doigt qui a ouvert le menu).
  const closeFromBackdrop = () => { if (Date.now() - openedAt.current > 350) onClose() }

  const item = (key: string, icon: ReactNode, label: string, onClick: () => void, opts: { danger?: boolean; trailing?: ReactNode } = {}) => (
    <button
      key={key}
      type="button"
      className="aid-btn aid-mi"
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 16, width: '100%', minHeight: 52, padding: '0 20px',
        fontSize: 19, fontWeight: 500, textAlign: 'left',
        color: opts.danger ? 'var(--danger)' : 'var(--aid-text)',
      }}
    >
      <span style={{ display: 'flex', flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      {opts.trailing}
    </button>
  )
  const sep = (key: string) => <div key={key} style={{ height: 1, background: 'var(--aid-menu-sep)', margin: '4px 24px' }} />
  const ic = { size: 22, strokeWidth: 1.8 }

  let body: ReactNode
  if (screen === 'projects') {
    body = (
      <>
        {item('back', <ChevronLeft {...ic} />, t('aid.addToProject'), () => setScreen('main'))}
        {sep('s0')}
        {projects.length === 0 && (
          <div style={{ padding: '10px 24px 14px', fontSize: 15, color: 'var(--aid-mid)', lineHeight: 1.4 }}>{t('aid.noProjects')}</div>
        )}
        <div style={{ maxHeight: 264, overflowY: 'auto' }}>
          {projects.map(p => item(
            p.id,
            <span style={{ width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: p.color }} />
            </span>,
            p.name,
            () => onMove(p.id),
            { trailing: conv.projectId === p.id ? <Check size={20} strokeWidth={2.2} style={{ flexShrink: 0 }} /> : undefined },
          ))}
        </div>
        {conv.projectId && <>{sep('s1')}{item('rm', <Folder {...ic} />, t('aid.removeFromProject'), () => onMove(null))}</>}
      </>
    )
  } else if (screen === 'confirm') {
    body = (
      <>
        <div style={{ padding: '14px 24px 8px', fontSize: 16, fontWeight: 600, color: 'var(--aid-text)', lineHeight: 1.35 }}>
          {t('aip.ui.deleteConvConfirm')}
        </div>
        {sep('s0')}
        {item('cancel', <ChevronLeft {...ic} />, t('aip.ui.cancel'), () => setScreen('main'))}
        {item('del', <Trash2 {...ic} />, t('activities.delete'), onDelete, { danger: true })}
      </>
    )
  } else {
    body = (
      <>
        {item('pin', conv.isPinned ? <PinOff {...ic} /> : <Pin {...ic} />, conv.isPinned ? t('w1g.unpin') : t('w1g.pin'), onPin)}
        {sep('s0')}
        {item('ren', <Pencil {...ic} />, t('record.commonRename'), onRename)}
        {item('proj', <Folder {...ic} />, t('aid.addToProject'), () => setScreen('projects'), {
          trailing: <ChevronRight size={18} strokeWidth={2} style={{ flexShrink: 0, color: 'var(--aid-mid)' }} />,
        })}
        {sep('s1')}
        {item('del', <Trash2 {...ic} />, t('activities.delete'), () => setScreen('confirm'), { danger: true })}
      </>
    )
  }

  if (typeof document === 'undefined') return null
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={conv.title} style={{ position: 'fixed', inset: 0, zIndex: 13000 }}>
      <div className="aid-lp-scrim" onClick={closeFromBackdrop} />

      {/* Ligne pressée, soulevée au-dessus du flou */}
      <motion.div
        initial={reduce ? false : { scale: 1 }}
        animate={{ scale: 1.03, transition: { duration: 0.22, ease: EASE } }}
        onClick={closeFromBackdrop}
        style={{
          position: 'fixed', top: rowTop, left: rect.left, width: rect.width, height: rect.height,
          display: 'flex', alignItems: 'center', gap: 16, padding: '0 18px', boxSizing: 'border-box',
          borderRadius: 'var(--r-lg)', background: 'var(--aid-lift-bg)', color: 'var(--aid-text)',
          boxShadow: 'var(--aid-lift-shadow)', fontFamily: 'var(--font-body)',
        }}
      >
        {pinnedRow ? <Pin size={22} strokeWidth={1.8} style={{ flexShrink: 0 }} /> : <MessageCircle size={22} strokeWidth={1.8} style={{ flexShrink: 0 }} />}
        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 19, fontWeight: 600, letterSpacing: '-0.01em' }}>
          {conv.title}
        </span>
      </motion.div>

      {/* Menu en verre */}
      <motion.div
        ref={menuRef}
        className="aid-menu"
        initial={reduce ? false : { opacity: 0, scale: 0.92 }}
        animate={{ opacity: pos ? 1 : 0, scale: pos ? 1 : 0.92, transition: { duration: 0.2, ease: EASE } }}
        style={{
          position: 'fixed', top: pos?.top ?? rowTop + rect.height + GAP, left: menuLeft, width: menuW,
          visibility: pos ? 'visible' : 'hidden', padding: '6px 0', overflow: 'hidden',
          transformOrigin: pos?.above ? '24px 100%' : '24px 0%', fontFamily: 'var(--font-body)',
        }}
      >
        {body}
      </motion.div>
    </div>,
    document.body,
  )
}
