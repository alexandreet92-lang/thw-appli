'use client'
// Sélecteur de langue (pilules FR / EN / ES). Réutilisé à l'entrée (/bienvenue)
// et dans le profil. Met à jour le contexte i18n + persiste.
import { useI18n } from '@/lib/i18n'
import { LANGS } from '@/lib/i18n/dictionaries'

export function LanguageSelector({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const { lang, setLang } = useI18n()
  const pad = size === 'sm' ? '6px 12px' : '9px 16px'
  const fs = size === 'sm' ? 13 : 14
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {LANGS.map(l => {
        const on = lang === l.code
        return (
          <button key={l.code} onClick={() => setLang(l.code)} aria-pressed={on} style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: pad, borderRadius: 999, cursor: 'pointer',
            border: `1px solid ${on ? 'var(--primary)' : 'var(--border-mid)'}`,
            background: on ? 'var(--primary-dim)' : 'var(--bg-card2)',
            color: on ? 'var(--primary)' : 'var(--text)',
            fontFamily: 'var(--font-body)', fontSize: fs, fontWeight: on ? 600 : 500, transition: 'all 0.15s',
          }}>
            <span style={{ fontSize: fs + 2 }}>{l.flag}</span>{l.label}
          </button>
        )
      })}
    </div>
  )
}
