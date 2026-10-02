'use client'
// ══════════════════════════════════════════════════════════════════════════
// « Modifier le salon » : nom, sujet, thèmes (nutrition / entraînement /
// récupération + thèmes personnalisés) et notifications. Feuille du bas
// nouveau style (champs doux, puces, interrupteur).
// ══════════════════════════════════════════════════════════════════════════
import { useMemo, useState } from 'react'
import { Hash, Volume2, Bell, Plus, Check } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { haptic } from '@/lib/haptics'
import { updateChannel, toggleChannelMute } from '@/lib/community/channels'
import { CmSheet, CmPill, CmField, CmCard, CmChip, CmSwitch, FB } from './kit'
import type { CommunityChannel } from '@/types/community'

export function ChannelEditSheet({ channel, isMuted, onClose, onSaved }: {
  channel: CommunityChannel
  isMuted: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useI18n()
  const [name, setName] = useState(channel.name)
  const [topic, setTopic] = useState(channel.topic ?? '')
  const [themes, setThemes] = useState<string[]>(channel.themes)
  const [customTheme, setCustomTheme] = useState('')
  const [muted, setMuted] = useState(isMuted)
  const [busy, setBusy] = useState(false)

  // Thèmes suggérés + ceux déjà posés (dédupliqués).
  const suggestions = useMemo(() => {
    const base = [t('w1g.ch.themeNutrition'), t('w1g.ch.themeTraining'), t('w1g.ch.themeRecovery')]
    const set = new Set(base.map(s => s.toLowerCase()))
    return base.concat(themes.filter(x => !set.has(x.toLowerCase())))
  }, [themes, t])
  const active = (label: string) => themes.some(x => x.toLowerCase() === label.toLowerCase())

  function toggleTheme(label: string) {
    const key = label.toLowerCase()
    setThemes(prev => prev.some(x => x.toLowerCase() === key) ? prev.filter(x => x.toLowerCase() !== key) : [...prev, label])
  }
  function addCustom() {
    const v = customTheme.trim().slice(0, 30)
    if (!v) return
    haptic('light')
    if (!themes.some(x => x.toLowerCase() === v.toLowerCase())) setThemes(prev => [...prev, v])
    setCustomTheme('')
  }

  return (
    <CmSheet onClose={onClose} title={t('w1g.ch.editTitle')} sub={`#${channel.name}`} zIndex={15300}
      footer={close => (
        <CmPill variant="primary" full height={52} disabled={!name.trim() || busy} style={{ fontSize: 16 }}
          onClick={async () => {
            if (!name.trim() || busy) return
            setBusy(true)
            await updateChannel(channel.id, { name, topic, themes })
            if (muted !== isMuted) await toggleChannelMute(channel.id, isMuted) // isMuted = état actuel
            haptic('success'); onSaved(); close()
          }}>
          {busy ? t('w1g.saving') : t('w1g.ch.save')}
        </CmPill>
      )}>
      <CmField label={t('w1g.ch.name')} style={{ marginTop: 4 }}>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', display: 'flex' }}>
            {channel.kind === 'voice' ? <Volume2 size={18} strokeWidth={2} /> : <Hash size={18} strokeWidth={2.4} />}
          </span>
          <input value={name} onChange={e => setName(e.target.value.slice(0, 60))} className="cm-input" style={{ paddingLeft: 40 }} />
        </div>
      </CmField>

      <CmField label={t('w1g.ch.topic')}>
        <textarea value={topic} onChange={e => setTopic(e.target.value.slice(0, 200))} rows={3} placeholder={t('w1g.ch.topicPh')} className="cm-input" style={{ resize: 'none', minHeight: 84 }} />
      </CmField>

      <CmField label={t('w1g.ch.themes')}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
          {suggestions.map(s => (
            <CmChip key={s} active={active(s)} onClick={() => toggleTheme(s)}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>{active(s) && <Check size={14} strokeWidth={2.8} />}{s}</span>
            </CmChip>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={customTheme} onChange={e => setCustomTheme(e.target.value.slice(0, 30))}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom() } }}
            placeholder={t('w1g.ch.themeCustomPh')} className="cm-input" style={{ flex: 1 }} />
          <button type="button" onClick={addCustom} disabled={!customTheme.trim()} aria-label={t('w1g.ch.themeAdd')} className="cm-btn cm-press"
            style={{ width: 50, borderRadius: 'var(--r-md)', background: 'var(--text)', color: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: customTheme.trim() ? 1 : 0.35 }}>
            <Plus size={20} strokeWidth={2.4} />
          </button>
        </div>
      </CmField>

      <CmField label={t('w1g.ch.notifs')}>
        <CmCard style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', minHeight: 64, boxSizing: 'border-box' }}>
          <span style={{ width: 34, height: 34, borderRadius: 'var(--r-sm)', background: 'var(--surface-chip)', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Bell size={17} strokeWidth={2} /></span>
          <span style={{ flex: 1, minWidth: 0, fontFamily: FB }}>
            <span style={{ display: 'block', fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{muted ? t('w1g.ch.notifMuted') : t('w1g.ch.notifAll')}</span>
            <span style={{ display: 'block', fontSize: 13.5, color: 'var(--text-mid)', marginTop: 1 }}>{muted ? t('w1g.ch.notifMutedSub') : t('w1g.ch.notifAllSub')}</span>
          </span>
          <CmSwitch on={!muted} onChange={v => setMuted(!v)} label={t('w1g.ch.notifs')} />
        </CmCard>
      </CmField>
    </CmSheet>
  )
}
