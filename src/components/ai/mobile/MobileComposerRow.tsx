'use client'
// ══════════════════════════════════════════════════════════════
// Interface IA MOBILE — ligne basse du composeur + pilule « Réflexion ».
// « + » (cercle blanc fin liseré → feuille Ajouter) · puce « Web »
// (réglage recherche web existant) · puce crédits (mini-jauge + %, données
// réelles) · [slot coach] · micro (dictée) · envoyer / discussion vocale /
// stop — mêmes gestionnaires que le composeur desktop.
// ══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { ArrowUp, AudioLines, ChevronDown, Clock, Globe, Mic, Plus } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

const round44: React.CSSProperties = {
  width: 44, height: 44, borderRadius: '50%', border: 'none', padding: 0, flexShrink: 0,
  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
}

export function MobileComposerRow({
  plusOpen,
  onPlus,
  webSearchOn,
  onToggleWeb,
  creditsPct,
  onCredits,
  extra,
  showMic,
  recording,
  onMic,
  loading,
  canSend,
  voiceAvailable,
  onStop,
  onSend,
  onVoice,
}: {
  plusOpen: boolean
  onPlus: () => void
  webSearchOn: boolean
  onToggleWeb: () => void
  creditsPct: number | null
  onCredits: () => void
  extra?: React.ReactNode
  showMic: boolean
  recording: boolean
  onMic: () => void
  loading: boolean
  canSend: boolean
  voiceAvailable: boolean
  onStop: () => void
  onSend: () => void
  onVoice: () => void
}) {
  const { t } = useI18n()
  const chip: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6, height: 36, padding: '0 12px', borderRadius: 'var(--r-pill)',
    fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
  }

  return (
    <>
    {extra && <div style={{ display: 'flex', padding: '2px 12px 0' }}>{extra}</div>}
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px 10px 12px' }}>
      <button
        type="button"
        data-guide="ai-plus"
        onClick={onPlus}
        aria-label={t('aim.plus.title')}
        aria-expanded={plusOpen}
        className="aim-press"
        style={{ ...round44, background: 'var(--float-bg)', color: 'var(--text)' }}
      >
        <Plus size={20} strokeWidth={2} />
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, overflow: 'hidden' }}>
      <button
        type="button"
        onClick={onToggleWeb}
        aria-pressed={webSearchOn}
        aria-label={t('aim.plus.web')}
        style={{ minHeight: 44, padding: 0, border: 'none', background: 'transparent', cursor: 'pointer', flexShrink: 0 }}
      >
        <span style={{
          ...chip,
          background: webSearchOn ? 'var(--primary-dim)' : 'transparent',
          boxShadow: webSearchOn ? 'none' : 'inset 0 0 0 1px var(--border-mid)',
          color: webSearchOn ? 'var(--primary)' : 'var(--text-dim)',
        }}>
          <Globe size={15} strokeWidth={2} />Web
        </span>
      </button>

      {creditsPct !== null && (
        <button
          type="button"
          onClick={onCredits}
          aria-label={t('aim.credits.chip', { n: creditsPct })}
          style={{ minHeight: 44, padding: 0, border: 'none', background: 'transparent', cursor: 'pointer', flexShrink: 0 }}
        >
          <span style={{ ...chip, gap: 8, boxShadow: 'inset 0 0 0 1px var(--border-mid)', color: 'var(--text-mid)', fontVariantNumeric: 'tabular-nums' }}>
            <span style={{ display: 'block', flexShrink: 0, position: 'relative', width: 28, height: 5, borderRadius: 'var(--r-pill)', background: 'var(--surface-bar)', overflow: 'hidden' }}>
              <span className="aim-gauge-fill" style={{
                position: 'absolute', left: 0, top: 0, bottom: 0, width: `${creditsPct}%`, borderRadius: 'var(--r-pill)',
                background: creditsPct > 95 ? 'var(--danger)' : creditsPct > 85 ? 'var(--charge-mid)' : 'var(--primary)',
              }} />
            </span>
            {creditsPct} %
          </span>
        </button>
      )}
      </div>

      <div style={{ flex: 1 }} />

      {showMic && (
        <button
          type="button"
          onClick={onMic}
          aria-label={recording ? t('aip.ui.cancel') : t('aim.composer.dictate')}
          className="aim-press"
          style={{ ...round44, width: 40, background: 'transparent', color: recording ? 'var(--primary)' : 'var(--text)' }}
        >
          <Mic size={20} strokeWidth={2} />
        </button>
      )}

      {loading ? (
        <button type="button" onClick={onStop} aria-label={t('aip.ui.stopGeneration')} className="aim-press aip-send-live"
          style={{ ...round44, background: 'var(--text)', color: 'var(--surface-card)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden><rect x="4" y="4" width="16" height="16" rx="2" /></svg>
        </button>
      ) : canSend ? (
        <button type="button" data-guide="ai-send" onClick={onSend} aria-label={t('aim.composer.send')} className="aim-press aip-send-live"
          style={{ ...round44, background: 'var(--primary)', color: 'var(--on-primary)' }}>
          <ArrowUp size={20} strokeWidth={2.4} />
        </button>
      ) : voiceAvailable ? (
        <button type="button" onClick={onVoice} aria-label={t('aip.ui.startVoice')} title={t('aip.ui.voiceChat')} className="aim-press aip-send-live"
          style={{ ...round44, background: 'var(--text)', color: 'var(--surface-card)' }}>
          <AudioLines size={20} strokeWidth={2} />
        </button>
      ) : (
        <button type="button" data-guide="ai-send" disabled aria-label={t('aim.composer.send')}
          style={{ ...round44, background: 'var(--surface-chip)', color: 'var(--text-dim)', cursor: 'not-allowed' }}>
          <ArrowUp size={20} strokeWidth={2.4} />
        </button>
      )}
    </div>
    </>
  )
}

/**
 * Pilule « Réflexion » : en direct (chrono réel depuis l'envoi) pendant la
 * génération, ou statique (cliquable → feuille « Processus de réflexion »)
 * avec le nombre réel de sources web citées.
 */
export function ThinkingPill({ since, sources, onOpen }: { since?: number; sources?: number; onOpen?: () => void }) {
  const { t } = useI18n()
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (since === undefined) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [since])
  const secs = since !== undefined ? Math.max(0, Math.round((now - since) / 1000)) : null
  const parts = [t('aim.thinking')]
  if (secs !== null) parts.push(`${secs} s`)
  if (sources && sources > 0) parts.push(t('aim.thinking.sources', { n: sources }))
  const inner = (
    <>
      <Clock size={14} strokeWidth={2.2} style={{ flexShrink: 0 }} />
      <span className={secs !== null ? 'ai-shimmer' : undefined} style={{ fontVariantNumeric: 'tabular-nums' }}>{parts.join(' · ')}</span>
      {onOpen && <ChevronDown size={14} strokeWidth={2.2} style={{ flexShrink: 0 }} />}
    </>
  )
  const pill: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 8, height: 30, padding: '0 12px', borderRadius: 'var(--r-pill)',
    background: 'var(--surface-chip)', color: 'var(--text-mid)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600,
  }
  if (!onOpen) return <span style={{ ...pill, alignSelf: 'flex-start' }} role="status">{inner}</span>
  return (
    <button type="button" onClick={onOpen} style={{ alignSelf: 'flex-start', minHeight: 44, padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}>
      <span style={pill}>{inner}</span>
    </button>
  )
}
