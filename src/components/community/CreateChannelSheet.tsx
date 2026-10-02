'use client'
// ══════════════════════════════════════════════════════════════════════════
// Création d'un salon : type Texte / Vocal (vocal : web uniquement — App Store
// 2.1) + nom + option « salon privé ». Feuille du bas nouveau style.
// ══════════════════════════════════════════════════════════════════════════
import { useState } from 'react'
import { Hash, Volume2, Lock } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { haptic } from '@/lib/haptics'
import { isNativeApp } from '@/lib/native/platform'
import { CmSheet, CmPill, CmField, CmCard, CmSwitch, FB, SOFT_SHADOW } from './kit'
import type { ChannelKind } from '@/types/community'

export function CreateChannelSheet({ onClose, onCreate }: {
  onClose: () => void
  onCreate: (name: string, kind: ChannelKind, isPrivate: boolean) => void | Promise<void>
}) {
  const { t } = useI18n()
  const [name, setName] = useState('')
  const [kind, setKind] = useState<ChannelKind>('text')
  const [priv, setPriv] = useState(false)
  const [busy, setBusy] = useState(false)

  return (
    <CmSheet onClose={onClose} title={t('w1g.ch.title')}
      footer={close => (
        <CmPill variant="primary" full height={52} disabled={!name.trim() || busy} style={{ fontSize: 16 }}
          onClick={async () => { const n = name.trim(); if (!n || busy) return; setBusy(true); await onCreate(n, kind, priv); haptic('success'); close() }}>
          {busy ? t('w1g.creating') : t('w1g.ch.create')}
        </CmPill>
      )}>
      {close => (
        <>
          {/* Type de salon. App Store 2.1 : sur iOS natif, pas de salon vocal. */}
          {!isNativeApp() && (
            <CmField label={t('w1g.ch.type')} style={{ marginTop: 4 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <TypeCard active={kind === 'text'} onClick={() => setKind('text')} icon={<Hash size={22} strokeWidth={2.4} />} title={t('w1g.ch.text')} sub={t('w1g.ch.textSub')} />
                <TypeCard active={kind === 'voice'} onClick={() => setKind('voice')} icon={<Volume2 size={22} strokeWidth={2} />} title={t('w1g.ch.voice')} sub={t('w1g.ch.voiceSub')} />
              </div>
            </CmField>
          )}

          <CmField label={t('w1g.ch.name')} style={isNativeApp() ? { marginTop: 4 } : undefined}>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', display: 'flex' }}>
                {kind === 'voice' ? <Volume2 size={18} strokeWidth={2} /> : <Hash size={18} strokeWidth={2.4} />}
              </span>
              <input autoFocus value={name} onChange={e => setName(e.target.value.slice(0, 60))}
                onKeyDown={async e => { if (e.key === 'Enter' && name.trim() && !busy) { setBusy(true); await onCreate(name.trim(), kind, priv); close() } }}
                placeholder={t('w1g.channelNamePlaceholder')} className="cm-input" style={{ paddingLeft: 40 }} />
            </div>
          </CmField>

          <CmCard style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', minHeight: 64, boxSizing: 'border-box' }}>
            <span style={{ width: 34, height: 34, borderRadius: 'var(--r-sm)', background: 'var(--surface-chip)', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Lock size={17} strokeWidth={2} /></span>
            <span style={{ flex: 1, minWidth: 0, fontFamily: FB }}>
              <span style={{ display: 'block', fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{t('w1g.ch.private')}</span>
              <span style={{ display: 'block', fontSize: 13.5, color: 'var(--text-mid)', marginTop: 1 }}>{t('w1g.ch.privateSub')}</span>
            </span>
            <CmSwitch on={priv} onChange={setPriv} label={t('w1g.ch.private')} />
          </CmCard>
        </>
      )}
    </CmSheet>
  )
}

function TypeCard({ active, onClick, icon, title, sub }: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; sub: string }) {
  return (
    <button type="button" onClick={() => { haptic('light'); onClick() }} aria-pressed={active} className="cm-btn cm-press"
      style={{ display: 'flex', flexDirection: 'column', gap: 6, textAlign: 'left', padding: 14, borderRadius: 'var(--r-lg)', background: 'var(--surface-card)',
        boxShadow: active ? 'inset 0 0 0 2px var(--text)' : SOFT_SHADOW, fontFamily: FB }}>
      <span style={{ color: active ? 'var(--text)' : 'var(--text-mid)', display: 'flex', height: 24, alignItems: 'center' }}>{icon}</span>
      <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{title}</span>
      <span style={{ fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.35 }}>{sub}</span>
    </button>
  )
}
