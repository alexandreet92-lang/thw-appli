'use client'
// ══════════════════════════════════════════════════════════════════════════
// Création d'un événement — assistant en 3 étapes (Emplacement · Infos ·
// Vérification). Mobile : sur-page plein écran coulissante. Desktop : modale
// centrée. Tokens uniquement, bordure seulement sur les inputs (Design System).
//   1) Salon vocal ou textuel + choix/création du salon concerné
//   2) Sujet, début (date+heure), fin (date+heure), fréquence, description, thème
//   3) Résumé + bouton créer
// ══════════════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { createEvent } from '@/lib/community/events'
import { createChannel } from '@/lib/community/channels'
import type { CommunityChannel, EventFrequency, ChannelKind } from '@/types/community'
import { useI18n } from '@/lib/i18n'

const FB = 'var(--font-body)', FD = 'var(--font-display)'
const FREQS: EventFrequency[] = ['once', 'daily', 'weekly', 'biweekly', 'monthly', 'yearly', 'weekdays', 'weekend']

export function CreateEventSheet({ spaceId, channels = [], canManageChannels = false, onClose, onCreated, onChannelsChanged }: {
  spaceId: string
  channels?: CommunityChannel[]
  canManageChannels?: boolean
  onClose: () => void
  onCreated: () => void
  onChannelsChanged?: () => void
}) {
  const { t } = useI18n()
  const [mounted, setMounted] = useState(false)
  const [shown, setShown] = useState(false)
  const [closing, setClosing] = useState(false)
  const [isNarrow, setIsNarrow] = useState(false)
  const [step, setStep] = useState(0)

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

  useEffect(() => { setMounted(true); const r = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(r) }, [])
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const f = () => setIsNarrow(mq.matches); f(); mq.addEventListener('change', f)
    return () => mq.removeEventListener('change', f)
  }, [])
  const requestClose = () => { setClosing(true); setShown(false); setTimeout(onClose, 280) }

  const chansOfKind = useMemo(() => localChannels.filter(c => c.kind === kind), [localChannels, kind])
  const selChannel = useMemo(() => localChannels.find(c => c.id === channelId) ?? null, [localChannels, channelId])

  async function createChan() {
    const n = newChanName.trim()
    if (!n) return
    const created = await createChannel(spaceId, n, kind)
    if (created) {
      setLocalChannels(prev => [...prev, created])
      setChannelId(created.id)
      setNewChanName(''); setCreatingChan(false)
      onChannelsChanged?.()
    }
  }

  const canNext1 = !!channelId
  const canNext2 = !!title.trim() && !!start

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
    if (ok) onCreated()
    else { setError(t('w3e.create_failed')); setBusy(false) }
  }

  if (!mounted || typeof document === 'undefined') return null

  const steps = [t('w3e.step_location'), t('w3e.step_infos'), t('w3e.step_review')]
  const themeSuggest = [t('w1g.ch.themeNutrition'), t('w1g.ch.themeTraining'), t('w1g.ch.themeRecovery')]

  const stepBar = (
    <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
      {steps.map((s, i) => (
        <div key={s} style={{ flex: 1 }}>
          <div style={{ height: 3, borderRadius: 2, background: i <= step ? 'var(--primary)' : 'var(--surface-neutral)', marginBottom: 6 }} />
          <span style={{ fontFamily: FB, fontSize: 11, fontWeight: i === step ? 700 : 500, color: i === step ? 'var(--primary)' : 'var(--text-dim)' }}>{s}</span>
        </div>
      ))}
    </div>
  )

  const body = (
    <>
      {isNarrow && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
          <span style={{ fontFamily: FB, fontSize: 11.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>{t('w3e.step_of', { n: step + 1, total: 3 })}</span>
          <button onClick={requestClose} aria-label={t('w3e.cancel')} style={{ width: 30, height: 30, border: 'none', background: 'transparent', color: 'var(--text-mid)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
      )}
      {stepBar}

      {/* ÉTAPE 1 — Emplacement */}
      {step === 0 && (
        <div>
          <h2 style={h2Style}>{t('w3e.q_where')}</h2>
          <p style={pStyle}>{t('w3e.q_where_sub')}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
            <KindCard active={kind === 'voice'} onClick={() => { setKind('voice'); setChannelId(null) }}
              icon={<svg {...ic}><path d="M11 5 6 9H2v6h4l5 4zM15.5 8.5a5 5 0 0 1 0 7M19 5a9 9 0 0 1 0 14" /></svg>}
              title={t('w3e.loc_voice')} sub={t('w3e.loc_voice_sub')} />
            <KindCard active={kind === 'text'} onClick={() => { setKind('text'); setChannelId(null) }}
              icon={<svg {...ic}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>}
              title={t('w3e.loc_text')} sub={t('w3e.loc_text_sub')} />
          </div>

          <label style={labelStyle}>{t('w3e.select_channel')}</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 'var(--space-3)' }}>
            {chansOfKind.length === 0 && !creatingChan && (
              <p style={{ fontFamily: FB, fontSize: 12.5, color: 'var(--text-dim)', padding: 'var(--space-2) 0' }}>{t('w3e.no_channel_of_kind')}</p>
            )}
            {chansOfKind.map(c => (
              <button key={c.id} onClick={() => setChannelId(c.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer', borderRadius: 'var(--r-sm)', padding: 'var(--space-2) var(--space-3)', background: channelId === c.id ? 'var(--primary-dim)' : 'var(--surface-neutral)', fontFamily: FB }}>
                <span style={{ color: channelId === c.id ? 'var(--primary)' : 'var(--text-dim)', fontSize: 14 }}>{c.kind === 'voice' ? '🔊' : '#'}</span>
                <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: channelId === c.id ? 'var(--primary)' : 'var(--text)' }}>{c.name}</span>
                {channelId === c.id && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>}
              </button>
            ))}
          </div>

          {canManageChannels && (creatingChan ? (
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <input autoFocus value={newChanName} onChange={e => setNewChanName(e.target.value.slice(0, 60))}
                onKeyDown={e => { if (e.key === 'Enter') void createChan() }}
                placeholder={t('w1g.channelNamePlaceholder')} style={{ ...inputStyle, flex: 1 }} />
              <button onClick={() => void createChan()} disabled={!newChanName.trim()}
                style={{ flexShrink: 0, padding: '0 var(--space-4)', border: 'none', borderRadius: 'var(--r-sm)', background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: FB, fontSize: 13, fontWeight: 600, cursor: newChanName.trim() ? 'pointer' : 'default', opacity: newChanName.trim() ? 1 : 0.5 }}>{t('w3e.create_channel')}</button>
            </div>
          ) : (
            <button onClick={() => setCreatingChan(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none', background: 'transparent', color: 'var(--primary)', fontFamily: FB, fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 'var(--space-2) 0' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
              {t('w3e.create_channel_cta')}
            </button>
          ))}
        </div>
      )}

      {/* ÉTAPE 2 — Infos */}
      {step === 1 && (
        <div>
          <h2 style={h2Style}>{t('w3e.q_what')}</h2>
          <p style={pStyle}>{t('w3e.q_what_sub')}</p>
          <Field label={t('w3e.field_subject')}><input value={title} onChange={e => setTitle(e.target.value.slice(0, 120))} placeholder={t('w3e.ph_event_title')} style={inputStyle} /></Field>
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <Field label={t('w3e.field_start')}><input type="datetime-local" value={start} onChange={e => setStart(e.target.value)} style={inputStyle} /></Field>
            <Field label={t('w3e.field_end')}><input type="datetime-local" value={end} min={start || undefined} onChange={e => setEnd(e.target.value)} style={inputStyle} /></Field>
          </div>
          <Field label={t('w3e.field_frequency')}>
            <select value={frequency} onChange={e => setFrequency(e.target.value as EventFrequency)} style={{ ...inputStyle, appearance: 'auto' }}>
              {FREQS.map(f => <option key={f} value={f}>{t(`w3e.freq_${f}`)}</option>)}
            </select>
          </Field>
          <Field label={t('w3e.field_details')}><textarea value={description} onChange={e => setDescription(e.target.value.slice(0, 2000))} rows={3} placeholder={t('w3e.ph_event_details')} style={{ ...inputStyle, resize: 'vertical', minHeight: 64 }} /></Field>
          <Field label={t('w3e.field_theme')}>
            <input value={theme} onChange={e => setTheme(e.target.value.slice(0, 60))} placeholder={t('w3e.ph_theme')} style={{ ...inputStyle, marginBottom: 'var(--space-2)' }} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              {themeSuggest.map(s => (
                <button key={s} type="button" onClick={() => setTheme(s)}
                  style={{ height: 30, padding: '0 var(--space-3)', borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer', fontFamily: FB, fontSize: 12, fontWeight: 600, background: theme.toLowerCase() === s.toLowerCase() ? 'var(--primary-dim)' : 'var(--surface-neutral)', color: theme.toLowerCase() === s.toLowerCase() ? 'var(--primary)' : 'var(--text-mid)' }}>{s}</button>
              ))}
            </div>
          </Field>
        </div>
      )}

      {/* ÉTAPE 3 — Vérification */}
      {step === 2 && (
        <div>
          <h2 style={h2Style}>{t('w3e.q_review')}</h2>
          <p style={pStyle}>{t('w3e.q_review_sub')}</p>
          <div style={{ background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <p style={{ fontFamily: FD, fontSize: 17, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{title || t('w3e.untitled')}</p>
            <SummaryRow label={t('w3e.sum_channel')} value={`${selChannel?.kind === 'voice' ? '🔊' : '#'} ${selChannel?.name ?? '—'}`} />
            <SummaryRow label={t('w3e.sum_start')} value={fmtDT(start)} />
            {end && <SummaryRow label={t('w3e.sum_end')} value={fmtDT(end)} />}
            <SummaryRow label={t('w3e.field_frequency')} value={t(`w3e.freq_${frequency}`)} />
            {theme.trim() && <SummaryRow label={t('w3e.field_theme')} value={theme.trim()} />}
            {description.trim() && <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)', margin: 'var(--space-1) 0 0', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{description.trim()}</p>}
          </div>
        </div>
      )}

      {error && <p style={{ fontFamily: FB, fontSize: 12.5, color: 'var(--charge-hard)', margin: 'var(--space-3) 0 0' }}>{error}</p>}

      {/* Navigation */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-5)' }}>
        <button onClick={() => step === 0 ? requestClose() : setStep(s => s - 1)}
          style={{ flex: '0 0 auto', height: 46, padding: '0 var(--space-5)', border: 'none', borderRadius: 'var(--r-sm)', background: 'var(--surface-neutral)', color: 'var(--text-mid)', fontFamily: FB, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
          {step === 0 ? t('w3e.cancel') : t('w3e.back')}
        </button>
        {step < 2 ? (
          <button onClick={() => setStep(s => s + 1)} disabled={step === 0 ? !canNext1 : !canNext2}
            style={{ flex: 1, height: 46, border: 'none', borderRadius: 'var(--r-sm)', background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: FB, fontSize: 13.5, fontWeight: 700, cursor: 'pointer', opacity: (step === 0 ? canNext1 : canNext2) ? 1 : 0.5 }}>{t('w3e.next')}</button>
        ) : (
          <button onClick={() => void submit()} disabled={busy}
            style={{ flex: 1, height: 46, border: 'none', borderRadius: 'var(--r-sm)', background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: FB, fontSize: 13.5, fontWeight: 700, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}>{busy ? t('w3e.creating') : t('w3e.create_event_btn')}</button>
        )}
      </div>
    </>
  )

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 15600, display: 'flex', alignItems: isNarrow ? 'stretch' : 'center', justifyContent: 'center' }}>
      <div onClick={requestClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)', opacity: shown && !closing ? 1 : 0, transition: 'opacity 0.26s ease' }} />
      <div role="dialog" aria-modal="true" style={isNarrow ? {
        position: 'relative', width: '100%', height: '100dvh', overflowY: 'auto',
        background: 'var(--bg-card)',
        transform: shown && !closing ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 0.30s cubic-bezier(0.32,0.72,0,1)',
        padding: 'calc(env(safe-area-inset-top) + var(--space-4)) var(--space-5) calc(var(--space-6) + env(safe-area-inset-bottom, 0px))',
      } : {
        position: 'relative', width: '100%', maxWidth: 480, maxHeight: 'calc(100dvh - 60px)', overflowY: 'auto',
        background: 'var(--bg-card)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow)',
        transform: shown && !closing ? 'scale(1)' : 'scale(0.96)', opacity: shown && !closing ? 1 : 0,
        transition: 'transform 0.22s ease, opacity 0.22s ease', padding: 'var(--space-6)',
      }}>
        {body}
      </div>
    </div>,
    document.body,
  )
}

const ic = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
const h2Style: React.CSSProperties = { fontFamily: FD, fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }
const pStyle: React.CSSProperties = { fontFamily: FB, fontSize: 12.5, color: 'var(--text-mid)', margin: '0 0 var(--space-4)' }
const labelStyle: React.CSSProperties = { display: 'block', fontFamily: FB, fontSize: 11.5, fontWeight: 600, color: 'var(--text-mid)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 'var(--space-2)' }
const inputStyle: React.CSSProperties = { width: '100%', boxSizing: 'border-box', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: 'var(--space-3) var(--space-4)', fontFamily: FB, fontSize: 13.5, color: 'var(--text)', outline: 'none' }

function fmtDT(v: string): string {
  if (!v) return '—'
  try {
    const d = new Date(v)
    return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }) + ' · ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  } catch { return v }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 'var(--space-4)', flex: 1, minWidth: 0 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}
function KindCard({ active, onClick, icon, title, sub }: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; sub: string }) {
  return (
    <button type="button" onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', width: '100%', textAlign: 'left', border: 'none', borderRadius: 'var(--r-md)', cursor: 'pointer', background: active ? 'var(--primary-dim)' : 'var(--surface-neutral)', padding: 'var(--space-3) var(--space-4)' }}>
      <span style={{ color: active ? 'var(--primary)' : 'var(--text-mid)', flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontFamily: FB, fontSize: 14, fontWeight: 700, color: active ? 'var(--primary)' : 'var(--text)' }}>{title}</span>
        <span style={{ display: 'block', fontFamily: FB, fontSize: 11.5, color: 'var(--text-dim)', marginTop: 1 }}>{sub}</span>
      </span>
      <span aria-hidden style={{ flexShrink: 0, width: 20, height: 20, borderRadius: '50%', background: active ? 'var(--primary)' : 'transparent', boxShadow: active ? 'none' : 'inset 0 0 0 2px var(--border-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {active && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--on-primary)' }} />}
      </span>
    </button>
  )
}
function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
      <span style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-dim)', flexShrink: 0 }}>{label}</span>
      <span style={{ fontFamily: FB, fontSize: 13, fontWeight: 600, color: 'var(--text)', textAlign: 'right' }}>{value}</span>
    </div>
  )
}
