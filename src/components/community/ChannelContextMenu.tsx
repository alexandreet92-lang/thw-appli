'use client'
// ══════════════════════════════════════════════════════════════════════════
// Menu d'un salon (appui long mobile / clic droit desktop), style « verre » :
// l'arrière-plan se floute, la ligne pressée remonte au premier plan et le
// menu s'ouvre dessous. Actions : Inviter · Épingler · Sourdine · Modifier ·
// Dupliquer · Supprimer (confirmation dans le menu). Modifier / dupliquer /
// supprimer : owner/admin uniquement.
// ══════════════════════════════════════════════════════════════════════════
import { useState } from 'react'
import { Hash, Volume2, UserPlus, Pin, PinOff, Pencil, Copy, Trash2, Bell, BellOff, ChevronLeft } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { GlassMenu, TNUM, type GlassEntry, type LpRect } from './kit'
import { digestLine, type ChannelDigest } from './channelDigest'
import type { CommunityChannel } from '@/types/community'

export function ChannelContextMenu({ channel, rect, isPinned, canManage, digest, unread, isMuted, onInvite, onTogglePin, onToggleMute, onEdit, onDuplicate, onDelete, onClose }: {
  channel: CommunityChannel
  rect: LpRect
  isPinned: boolean
  canManage: boolean
  digest: ChannelDigest | null
  unread: number
  isMuted: boolean
  onInvite: () => void
  onTogglePin: () => void
  onToggleMute: () => void
  onEdit: () => void
  onDuplicate: () => void
  onDelete: () => void
  onClose: () => void
}) {
  const { t } = useI18n()
  const [confirmDel, setConfirmDel] = useState(false)
  const run = (fn: () => void) => () => { fn(); onClose() }
  const ic = { size: 20, strokeWidth: 1.9 }
  const voice = channel.kind === 'voice'
  const sub = digestLine(digest, channel, t)

  const preview = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, minHeight: rect.height, padding: '11px 16px', boxSizing: 'border-box' }}>
      <span style={{ width: 26, display: 'flex', justifyContent: 'center', color: 'var(--text-mid)', flexShrink: 0 }}>
        {voice ? <Volume2 size={21} strokeWidth={2} /> : <Hash size={22} strokeWidth={2.4} />}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 16.5, fontWeight: 800, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{channel.name}</span>
        {sub && <span style={{ display: 'block', marginTop: 2, fontSize: 14, color: 'var(--text-mid)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</span>}
      </span>
      {unread > 0 && (
        <span style={{ ...TNUM, minWidth: 26, height: 24, padding: '0 8px', boxSizing: 'border-box', borderRadius: 'var(--r-pill)', background: 'var(--primary)', color: 'var(--on-primary)', fontSize: 13, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{unread}</span>
      )}
    </div>
  )

  const items: GlassEntry[] = confirmDel ? [
    { key: 'q', label: <span style={{ whiteSpace: 'normal', display: 'block', fontSize: 14.5, fontWeight: 600, color: 'var(--text-mid)', lineHeight: 1.35, padding: '8px 0' }}>{t('w1g.ch.deleteConfirm', { name: channel.name })}</span>, onClick: () => {} },
    'sep',
    { key: 'cancel', icon: <ChevronLeft {...ic} />, label: t('w1g.cancel'), onClick: () => setConfirmDel(false) },
    { key: 'yes', icon: <Trash2 {...ic} />, label: t('w1g.ch.deleteYes'), danger: true, onClick: run(onDelete) },
  ] : [
    { key: 'invite', icon: <UserPlus {...ic} />, label: t('w1g.ch.invite'), onClick: run(onInvite) },
    { key: 'pin', icon: isPinned ? <PinOff {...ic} /> : <Pin {...ic} />, label: isPinned ? t('w1g.ch.unpin') : t('w1g.ch.pin'), onClick: run(onTogglePin) },
    { key: 'mute', icon: isMuted ? <Bell {...ic} /> : <BellOff {...ic} />, label: isMuted ? t('w1g.unmuteNotifications') : t('w1g.mute'), onClick: run(onToggleMute) },
    ...(canManage ? [
      'sep' as const,
      { key: 'edit', icon: <Pencil {...ic} />, label: t('w1g.ch.edit'), onClick: run(onEdit) },
      { key: 'dup', icon: <Copy {...ic} />, label: t('w1g.ch.duplicate'), onClick: run(onDuplicate) },
      'sep' as const,
      { key: 'del', icon: <Trash2 {...ic} />, label: t('w1g.ch.delete'), danger: true, onClick: () => setConfirmDel(true) },
    ] : []),
  ]

  return <GlassMenu rect={rect} preview={preview} items={items} onClose={onClose} label={`#${channel.name}`} />
}
