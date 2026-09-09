'use client'
// ══════════════════════════════════════════════════════════════════════════
// Menu d'actions d'un salon (ouvert par appui long mobile / clic droit desktop).
// Sur-page coulissante bas→haut. Actions : Inviter · Épingler/Désépingler ·
// Modifier · Dupliquer · Supprimer (avec confirmation). Les actions de gestion
// (modifier / dupliquer / supprimer) ne s'affichent que pour owner/admin.
// ══════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '@/lib/i18n'
import type { CommunityChannel } from '@/types/community'

const FB = 'var(--font-body)', FD = 'var(--font-display)'

export function ChannelContextMenu({ channel, isPinned, canManage, onInvite, onTogglePin, onEdit, onDuplicate, onDelete, onClose }: {
  channel: CommunityChannel
  isPinned: boolean
  canManage: boolean
  onInvite: () => void
  onTogglePin: () => void
  onEdit: () => void
  onDuplicate: () => void
  onDelete: () => void
  onClose: () => void
}) {
  const { t } = useI18n()
  const [mounted, setMounted] = useState(false)
  const [shown, setShown] = useState(false)
  const [closing, setClosing] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  useEffect(() => { setMounted(true); const r = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(r) }, [])
  const requestClose = () => { setClosing(true); setShown(false); setTimeout(onClose, 260) }
  const run = (fn: () => void) => { fn(); requestClose() }

  if (!mounted || typeof document === 'undefined') return null

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 15400, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={requestClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', opacity: shown && !closing ? 1 : 0, transition: 'opacity 0.24s ease' }} />
      <div role="dialog" aria-modal="true" style={{
        position: 'relative', width: '100%', maxWidth: 560, maxHeight: 'calc(100dvh - 40px)', overflowY: 'auto',
        background: 'transparent',
        transform: shown && !closing ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 0.30s cubic-bezier(0.32,0.72,0,1)',
        padding: '0 var(--space-3) calc(var(--space-3) + env(safe-area-inset-bottom, 0px))',
      }}>
        {/* En-tête : avatar/nom du salon */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-2) 0' }}>
          <span style={{ width: 38, height: 4, borderRadius: 2, background: 'var(--border-mid)' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: '0 var(--space-2) var(--space-3)' }}>
          <span style={{ fontFamily: FD, fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{channel.kind === 'voice' ? '🔊' : '#'}{channel.name}</span>
        </div>

        {/* Groupe 1 : Inviter / Épingler */}
        <Group>
          <Row icon={<IconInvite />} label={t('w1g.ch.invite')} onClick={() => run(onInvite)} />
          <Row icon={<IconPin filled={isPinned} />} label={isPinned ? t('w1g.ch.unpin') : t('w1g.ch.pin')} onClick={() => run(onTogglePin)} />
        </Group>

        {/* Groupe 2 : Modifier / Dupliquer (gestion) */}
        {canManage && (
          <Group>
            <Row icon={<IconEdit />} label={t('w1g.ch.edit')} onClick={() => run(onEdit)} />
            <Row icon={<IconDuplicate />} label={t('w1g.ch.duplicate')} onClick={() => run(onDuplicate)} />
          </Group>
        )}

        {/* Groupe 3 : Supprimer (avec confirmation) */}
        {canManage && (
          <Group>
            {!confirmDel ? (
              <Row icon={<IconTrash />} label={t('w1g.ch.delete')} danger onClick={() => setConfirmDel(true)} />
            ) : (
              <div style={{ padding: 'var(--space-3) var(--space-4)' }}>
                <p style={{ margin: '0 0 var(--space-3)', fontFamily: FB, fontSize: 13.5, color: 'var(--text)', lineHeight: 1.4 }}>{t('w1g.ch.deleteConfirm', { name: channel.name })}</p>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <button onClick={() => setConfirmDel(false)} style={{ flex: 1, height: 40, border: 'none', borderRadius: 'var(--r-sm)', background: 'var(--surface-neutral)', color: 'var(--text-mid)', fontFamily: FB, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{t('w1g.cancel')}</button>
                  <button onClick={() => run(onDelete)} style={{ flex: 1, height: 40, border: 'none', borderRadius: 'var(--r-sm)', background: 'var(--charge-hard)', color: 'var(--on-primary)', fontFamily: FB, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>{t('w1g.ch.deleteYes')}</button>
                </div>
              </div>
            )}
          </Group>
        )}
      </div>
    </div>,
    document.body,
  )
}

function Group({ children }: { children: React.ReactNode }) {
  return <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--r-md)', overflow: 'hidden', marginBottom: 'var(--space-2)', boxShadow: 'var(--shadow)' }}>{children}</div>
}

function Row({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', width: '100%', textAlign: 'left', border: 'none', background: 'transparent', cursor: 'pointer', padding: 'var(--space-4) var(--space-4)', color: danger ? 'var(--charge-hard)' : 'var(--text)' }}>
      <span style={{ flexShrink: 0, width: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', color: danger ? 'var(--charge-hard)' : 'var(--text-mid)' }}>{icon}</span>
      <span style={{ fontFamily: FB, fontSize: 15, fontWeight: 500 }}>{label}</span>
    </button>
  )
}

const S = { width: 21, height: 21, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
function IconInvite() { return <svg {...S}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6M22 11h-6" /></svg> }
function IconPin({ filled }: { filled?: boolean }) { return <svg {...S} fill={filled ? 'currentColor' : 'none'}><path d="M12 17v5M9 3h6l-1 6 3 3H7l3-3-1-6z" /></svg> }
function IconEdit() { return <svg {...S}><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg> }
function IconDuplicate() { return <svg {...S}><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg> }
function IconTrash() { return <svg {...S}><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /></svg> }
