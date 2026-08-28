'use client'
// ══════════════════════════════════════════════════════════════
// SUGGESTIONS PROACTIVES — « le coach qui propose ». Lit les signaux réels
// (blessure, récupération, inactivité, absence de plan) et affiche des cartes
// ACTIONNABLES : chaque carte ouvre le coach sur l'action adaptée ou navigue
// vers la bonne page. Rejetable pour la journée (localStorage).
// ══════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/currentUser'
import { detectSignals, type Signal, type SignalKind } from '@/lib/suggestions/engine'
import { FB, FD } from './lib'

const DISMISS_KEY = () => `thw_suggest_dismissed_${new Date().toISOString().slice(0, 10)}`
function readDismissed(): SignalKind[] {
  try { return JSON.parse(localStorage.getItem(DISMISS_KEY()) || '[]') as SignalKind[] } catch { return [] }
}

// Icône par type de signal (trait, currentColor).
function Icon({ kind }: { kind: SignalKind }) {
  const p = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none' as const, stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (kind) {
    case 'injury':     return <svg {...p}><path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 000-7.8z"/></svg>
    case 'recovery':   return <svg {...p}><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/></svg>
    case 'inactivity': return <svg {...p}><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
    case 'plan':       return <svg {...p}><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/></svg>
  }
}

export function Suggestions() {
  const { t } = useI18n()
  const [signals, setSignals] = useState<Signal[] | null>(null)
  const [dismissed, setDismissed] = useState<SignalKind[]>([])

  useEffect(() => {
    setDismissed(readDismissed())
    let off = false
    void (async () => {
      try {
        const sb = createClient()
        const user = await getCurrentUser()
        if (!user) { if (!off) setSignals([]); return }
        const s = await detectSignals(sb, user.id)
        if (!off) setSignals(s)
      } catch { if (!off) setSignals([]) }
    })()
    return () => { off = true }
  }, [])

  const dismiss = (kind: SignalKind) => {
    const next = [...new Set([...dismissed, kind])]
    setDismissed(next)
    try { localStorage.setItem(DISMISS_KEY(), JSON.stringify(next)) } catch { /* ignore */ }
  }

  // Ouvre le coach sur une action rapide (réutilise le mécanisme coach_action).
  const openCoach = (action: string) => {
    try { sessionStorage.setItem('coach_action', action) } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent('thw:open-coach'))
  }

  if (!signals) return null
  const visible = signals.filter(s => !dismissed.includes(s.kind))
  if (visible.length === 0) return null

  // Contenu localisé + CTA par signal.
  const cardOf = (s: Signal) => {
    switch (s.kind) {
      case 'injury':     return { title: t('suggest.injury_title'), body: s.detail ? t('suggest.injury_body_named', { names: s.detail }) : t('suggest.injury_body'), cta: t('suggest.injury_cta'), onClick: () => openCoach('douleur_blessure') }
      case 'recovery':   return { title: t('suggest.recovery_title'), body: t('suggest.recovery_body'), cta: t('suggest.recovery_cta'), onClick: () => openCoach('analyser_recuperation') }
      case 'inactivity': return { title: t('suggest.inactivity_title'), body: t('suggest.inactivity_body', { days: s.days ?? 0 }), cta: t('suggest.inactivity_cta'), href: '/session' }
      case 'plan':       return { title: t('suggest.plan_title'), body: t('suggest.plan_body'), cta: t('suggest.plan_cta'), onClick: () => openCoach('training_plan') }
    }
  }

  return (
    <div style={{ marginBottom: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <div style={{ fontFamily: FB, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-mid)' }}>{t('suggest.title')}</div>
      {visible.slice(0, 3).map(s => {
        const c = cardOf(s)
        const accent = s.tone === 'warn' ? 'var(--danger)' : 'var(--primary)'
        return (
          <div key={s.kind} style={{ position: 'relative', display: 'flex', gap: 'var(--space-3)', padding: 'var(--space-4)', borderRadius: 'var(--r-lg)', background: 'var(--bg-card2)', border: `1px solid color-mix(in srgb, ${accent} 30%, var(--border))` }}>
            <span style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center', color: accent, background: `color-mix(in srgb, ${accent} 12%, transparent)` }}><Icon kind={s.kind} /></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: FD, fontSize: 14.5, fontWeight: 700, color: 'var(--text)' }}>{c.title}</div>
              <div style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.5, marginTop: 2 }}>{c.body}</div>
              {c.href ? (
                <Link href={c.href} style={{ display: 'inline-block', marginTop: 'var(--space-3)', padding: '6px 12px', borderRadius: 999, background: accent, color: 'var(--on-primary)', fontFamily: FB, fontSize: 12.5, fontWeight: 700, textDecoration: 'none' }}>{c.cta}</Link>
              ) : (
                <button type="button" onClick={c.onClick} style={{ marginTop: 'var(--space-3)', padding: '6px 12px', borderRadius: 999, border: 'none', background: accent, color: 'var(--on-primary)', fontFamily: FB, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>{c.cta}</button>
              )}
            </div>
            <button type="button" onClick={() => dismiss(s.kind)} aria-label={t('suggest.dismiss')} style={{ position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: 8, border: 'none', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        )
      })}
    </div>
  )
}
