'use client'
// ══════════════════════════════════════════════════════════════════════════
// Création d'un événement — assistant en 3 étapes propres (Emplacement · Infos
// · Vérification) dans une feuille du bas pleine hauteur : barre de progression
// animée, étapes qui glissent latéralement, pied fixe Retour / Suivant.
//   1) Salon vocal (web uniquement) ou textuel + choix/création du salon
//   2) Sujet, début, fin, fréquence (puces), description, thème
//   3) Résumé + créer
// ══════════════════════════════════════════════════════════════════════════
import { useMemo, useState } from 'react'
import { Hash, Volume2, MessageCircle, Plus } from 'lucide-react'
import { createEvent } from '@/lib/community/events'
import { createChannel } from '@/lib/community/channels'
import { isNativeApp } from '@/lib/native/platform'
import { useI18n } from '@/lib/i18n'
import { haptic } from '@/lib/haptics'
import { CmSheet, CmPill, CmCard, CmField, CmChip, CmCheck, FB, TNUM, stagger } from './kit'
import type { CommunityChannel, EventFrequency, ChannelKind } from '@/types/community'

const FREQS: EventFrequency[] = ['once', 'daily', 'weekly', 'biweekly', 'monthly', 'yearly', 'weekdays', 'weekend']

function fmtDT(v: string): string {
  if (!v) return '—'
  try {
    const d = new Date(v)
    return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }) + ' · ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  } catch { return v }
}

export function CreateEventSheet({ spaceId, channels = [], canManageChannels = false, onClose, onCreated, onChannelsChanged }: {
  spaceId: string
  channels?: CommunityChannel[]
  canManageChannels?: boolean
  onClose: () => void
  onCreated: () => void
  onChannelsChanged?: () => void
}) {
  const { t } = useI18n()
  const native = isNativeApp()
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState<'next' | 'prev'>('next')

  // Étape 1
  const [kind, setKind] = useState<ChannelKind>('text')
  const [channelId, setChannelId] = useState<string | null>(null)
  const [creatingChan, setCreatingChan] = useState(false)
  const [newChanName, setNewChanName] = useState('')
  const [localChannels, setLocalChannels] = useState<CommunityChannel[]>(channels)

  // Étape 2
  const [title, setTitle] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [frequency, setFrequency] = useState<EventFrequency>('once')
  const [description, setDescription] = useState('')
  const [theme, setTheme] = useState('')

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const chansOfKind = useMemo(() => localChannels.filter(c => c.kind === kind), [localChannels, kind])
  const selChannel = useMemo(() => localChannels.find(c => c.id === channelId) ?? null, [localChannels, channelId])

  async function createChan() {
    const n = newChanName.trim()
    if (!n) return
    const created = await createChannel(spaceId, n, kind)
    if (created) {
      haptic('success')
      setLocalChannels(prev => [...prev, created])
      setChannelId(created.id)
      setNewChanName(''); setCreatingChan(false)
      onChannelsChanged?.()
    }
  }

  const canNext1 = !!channelId
  const canNext2 = !!title.trim() && !!start
  const go = (to: number) => { haptic('light'); setDir(to > step ? 'next' : 'prev'); setStep(to); setError(null) }

  async function submit() {
    if (busy) return
    const startsAt = new Date(start)
    if (isNaN(startsAt.getTime())) { setError(t('w3e.invalid_date')); return }
    setBusy(true); setError(null)
    const endsAt = end ? new Date(end) : null
    const ok = await createEvent({
      spaceId, title: title.trim(), kind: 'sortie',
      description: description.trim() || null,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt && !isNaN(endsAt.getTime()) ? endsAt.toISOString() : null,
      frequency, theme: theme.trim() || null, channelId,
    })
    if (ok) { haptic('success'); onCreated() }
    else { setError(t('w3e.create_failed')); setBusy(false) }
  }

  const steps = [t('w3e.step_location'), t('w3e.step_infos'), t('w3e.step_review')]
  const themeSuggest = [t('w1g.ch.themeNutrition'), t('w1g.ch.themeTraining'), t('w1g.ch.themeRecovery')]

  const footer = (close: () => void) => (
    <>
      {error && <p className="cm-in" style={{ margin: 0, textAlign: 'center', fontSize: 14, fontWeight: 650, color: 'var(--danger)' }}>{error}</p>}
      <div style={{ display: 'flex', gap: 10 }}>
        <CmPill variant="chip" height={52} onClick={() => step === 0 ? close() : go(step - 1)} style={{ flex: '0 0 auto', minWidth: 110 }}>
          {step === 0 ? t('w3e.cancel') : t('w3e.back')}
        </CmPill>
        {step < 2 ? (
          <CmPill variant="primary" height={52} disabled={step === 0 ? !canNext1 : !canNext2} onClick={() => go(step + 1)} style={{ flex: 1, fontSize: 16 }}>{t('w3e.next')}</CmPill>
        ) : (
          <CmPill variant="primary" height={52} disabled={busy} onClick={() => void submit()} style={{ flex: 1, fontSize: 16 }}>{busy ? t('w3e.creating') : t('w3e.create_event_btn')}</CmPill>
        )}
      </div>
    </>
  )

  return (
    <CmSheet full onClose={onClose} title={t('w3e.create_event')} sub={t('w3e.step_of', { n: step + 1, total: 3 })} zIndex={15600} footer={footer}>
      {/* Progression */}
      <div style={{ display: 'flex', gap: 6, margin: '2px 0 4px' }}>
        {steps.map((s, i) => (
          <div key={s} style={{ flex: 1 }}>
            <div style={{ height: 4, borderRadius: 'var(--r-pill)', background: 'var(--surface-bar)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: '100%', borderRadius: 'var(--r-pill)', background: 'var(--primary)', transformOrigin: 'left', transform: `scaleX(${i <= step ? 1 : 0})`, transition: 'transform .45s cubic-bezier(.22,1,.36,1)' }} />
            </div>
            <span style={{ display: 'block', marginTop: 7, fontSize: 12.5, fontWeight: i === step ? 800 : 600, color: i === step ? 'var(--text)' : 'var(--text-dim)' }}>{s}</span>
          </div>
        ))}
      </div>

      <div key={step} className={dir === 'next' ? 'cm-step-next' : 'cm-step-prev'}>
        {/* ÉTAPE 1 — Emplacement */}
        {step === 0 && (
          <>
            <StepTitle title={t('w3e.q_where')} sub={t('w3e.q_where_sub')} />
            <CmCard style={{ overflow: 'hidden' }}>
              {/* App Store 2.1 : pas de salon vocal sur iOS natif. */}
              {!native && (
                <KindRow first active={kind === 'voice'} onClick={() => { setKind('voice'); setChannelId(null) }}
                  icon={<Volume2 size={19} strokeWidth={2} />} title={t('w3e.loc_voice')} sub={t('w3e.loc_voice_sub')} />
              )}
              <KindRow first={native} active={kind === 'text'} onClick={() => { setKind('text'); setChannelId(null) }}
                icon={<MessageCircle size={19} strokeWidth={2} />} title={t('w3e.loc_text')} sub={t('w3e.loc_text_sub')} />
            </CmCard>

            <CmField label={t('w3e.select_channel')}>
              {chansOfKind.length === 0 && !creatingChan ? (
                <CmCard style={{ padding: 16, fontSize: 14.5, color: 'var(--text-mid)' }}>{t('w3e.no_channel_of_kind')}</CmCard>
              ) : chansOfKind.length > 0 && (
                <CmCard style={{ overflow: 'hidden' }}>
                  {chansOfKind.map((c, i) => (
                    <button key={c.id} type="button" onClick={() => { haptic('light'); setChannelId(c.id) }} className="cm-btn cm-row cm-in"
                      style={{ ...stagger(i, 0, 24), display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 54, padding: '8px 16px', boxSizing: 'border-box', textAlign: 'left', borderTop: i ? '1px solid var(--border)' : 'none', fontFamily: FB }}>
                      <span style={{ color: 'var(--text-mid)', display: 'flex', width: 22, justifyContent: 'center' }}>{c.kind === 'voice' ? <Volume2 size={18} strokeWidth={2} /> : <Hash size={19} strokeWidth={2.4} />}</span>
                      <span style={{ flex: 1, minWidth: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                      <CmCheck on={channelId === c.id} />
                    </button>
                  ))}
                </CmCard>
              )}
              {canManageChannels && (creatingChan ? (
                <div className="cm-in" style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <input autoFocus value={newChanName} onChange={e => setNewChanName(e.target.value.slice(0, 60))}
                    onKeyDown={e => { if (e.key === 'Enter') void createChan() }}
                    placeholder={t('w1g.channelNamePlaceholder')} className="cm-input" style={{ flex: 1 }} />
                  <CmPill variant="primary" disabled={!newChanName.trim()} onClick={() => void createChan()} height={50}>{t('w3e.create_channel')}</CmPill>
                </div>
              ) : (
                <button type="button" onClick={() => setCreatingChan(true)} className="cm-btn cm-press"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10, minHeight: 44, padding: '0 4px', color: 'var(--primary)', fontSize: 15, fontWeight: 750 }}>
                  <Plus size={17} strokeWidth={2.4} />{t('w3e.create_channel_cta')}
                </button>
              ))}
            </CmField>
          </>
        )}

        {/* ÉTAPE 2 — Infos */}
        {step === 1 && (
          <>
            <StepTitle title={t('w3e.q_what')} sub={t('w3e.q_what_sub')} />
            <CmField label={t('w3e.field_subject')} style={{ marginTop: 0 }}>
              <input value={title} onChange={e => setTitle(e.target.value.slice(0, 120))} placeholder={t('w3e.ph_event_title')} className="cm-input" />
            </CmField>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <CmField label={t('w3e.field_start')}><input type="datetime-local" value={start} onChange={e => setStart(e.target.value)} className="cm-input" style={{ ...TNUM, fontSize: 15, padding: '13px 10px' }} /></CmField>
              <CmField label={t('w3e.field_end')}><input type="datetime-local" value={end} min={start || undefined} onChange={e => setEnd(e.target.value)} className="cm-input" style={{ ...TNUM, fontSize: 15, padding: '13px 10px' }} /></CmField>
            </div>
            <CmField label={t('w3e.field_frequency')}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {FREQS.map(f => <CmChip key={f} active={frequency === f} onClick={() => setFrequency(f)}>{t(`w3e.freq_${f}`)}</CmChip>)}
              </div>
            </CmField>
            <CmField label={t('w3e.field_details')}>
              <textarea value={description} onChange={e => setDescription(e.target.value.slice(0, 2000))} rows={3} placeholder={t('w3e.ph_event_details')} className="cm-input" style={{ resize: 'none', minHeight: 90 }} />
            </CmField>
            <CmField label={t('w3e.field_theme')}>
              <input value={theme} onChange={e => setTheme(e.target.value.slice(0, 60))} placeholder={t('w3e.ph_theme')} className="cm-input" style={{ marginBottom: 10 }} />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {themeSuggest.map(s => <CmChip key={s} active={theme.toLowerCase() === s.toLowerCase()} onClick={() => setTheme(s)}>{s}</CmChip>)}
              </div>
            </CmField>
          </>
        )}

        {/* ÉTAPE 3 — Vérification */}
        {step === 2 && (
          <>
            <StepTitle title={t('w3e.q_review')} sub={t('w3e.q_review_sub')} />
            <CmCard style={{ padding: 18 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.015em' }}>{title || t('w3e.untitled')}</div>
              {description.trim() && <p style={{ margin: '8px 0 0', fontSize: 14.5, color: 'var(--text-mid)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{description.trim()}</p>}
            </CmCard>
            <CmCard style={{ overflow: 'hidden', marginTop: 12 }}>
              <SummaryRow first label={t('w3e.sum_channel')} value={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>{selChannel?.kind === 'voice' ? <Volume2 size={15} strokeWidth={2} /> : <Hash size={15} strokeWidth={2.4} />}{selChannel?.name ?? '—'}</span>} />
              <SummaryRow label={t('w3e.sum_start')} value={fmtDT(start)} />
              {end && <SummaryRow label={t('w3e.sum_end')} value={fmtDT(end)} />}
              <SummaryRow label={t('w3e.field_frequency')} value={t(`w3e.freq_${frequency}`)} />
              {theme.trim() && <SummaryRow label={t('w3e.field_theme')} value={theme.trim()} />}
            </CmCard>
          </>
        )}
      </div>
    </CmSheet>
  )
}

function StepTitle({ title, sub }: { title: string; sub: string }) {
  return (
    <div style={{ margin: '18px 4px 16px' }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>{title}</div>
      <div style={{ marginTop: 4, fontSize: 14.5, color: 'var(--text-mid)' }}>{sub}</div>
    </div>
  )
}
function KindRow({ active, onClick, icon, title, sub, first }: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; sub: string; first?: boolean }) {
  return (
    <button type="button" onClick={() => { haptic('light'); onClick() }} className="cm-btn cm-row"
      style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 64, padding: '10px 16px', boxSizing: 'border-box', textAlign: 'left', borderTop: first ? 'none' : '1px solid var(--border)', fontFamily: FB }}>
      <span style={{ width: 36, height: 36, borderRadius: 'var(--r-sm)', background: active ? 'var(--primary-dim)' : 'var(--surface-chip)', color: active ? 'var(--primary)' : 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 16, fontWeight: 750, color: 'var(--text)' }}>{title}</span>
        <span style={{ display: 'block', fontSize: 13.5, color: 'var(--text-mid)', marginTop: 1 }}>{sub}</span>
      </span>
      <CmCheck on={active} />
    </button>
  )
}
function SummaryRow({ label, value, first }: { label: string; value: React.ReactNode; first?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 50, padding: '8px 16px', borderTop: first ? 'none' : '1px solid var(--border)', fontFamily: FB }}>
      <span style={{ fontSize: 14.5, color: 'var(--text-mid)', flexShrink: 0 }}>{label}</span>
      <span style={{ ...TNUM, fontSize: 14.5, fontWeight: 750, color: 'var(--text)', textAlign: 'right', textTransform: 'capitalize' }}>{value}</span>
    </div>
  )
}
