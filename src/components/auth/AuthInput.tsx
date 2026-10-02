'use client'
// Champ des écrans d'entrée : libellé gris au-dessus, champ blanc arrondi
// (--surface-card), « Afficher / Masquer » en texte à droite pour les mots de
// passe. Bordure UNIQUEMENT au focus (anneau --primary + halo) ou en erreur.
import { useId, useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { SHEET_CARD_SHADOW } from '@/components/ui/BottomSheet'

interface Props {
  label: string
  type: 'email' | 'password' | 'text'
  placeholder: string
  value: string
  onChange: (v: string) => void
  showToggle?: boolean
  error?: string
  autoComplete?: string
  autoFocus?: boolean
  /** Entrée clavier (valide le formulaire). */
  onEnter?: () => void
  /** Aide grise sous le champ (masquée quand une erreur s'affiche). */
  hint?: string
  onBlur?: () => void
}

export function AuthInput({ label, type, placeholder, value, onChange, showToggle, error, autoComplete, autoFocus, onEnter, hint, onBlur }: Props) {
  const { t } = useI18n()
  const id = useId()
  const [visible, setVisible] = useState(false)
  const [focus, setFocus] = useState(false)
  const ring = error ? 'inset 0 0 0 2px var(--danger)' : focus ? 'inset 0 0 0 2px var(--primary), 0 0 0 4px var(--primary-dim)' : SHEET_CARD_SHADOW
  const inputType = showToggle ? (visible ? 'text' : 'password') : type

  return (
    <div style={{ marginBottom: 14 }}>
      <label htmlFor={id} style={{ display: 'block', margin: '0 4px 6px', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: 'var(--text-mid)' }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          id={id}
          type={inputType}
          inputMode={type === 'email' ? 'email' : undefined}
          autoCapitalize={type === 'text' ? undefined : 'none'}
          autoCorrect="off"
          spellCheck={false}
          placeholder={placeholder}
          value={value}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          aria-invalid={!!error}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocus(true)}
          onBlur={() => { setFocus(false); onBlur?.() }}
          onKeyDown={e => { if (e.key === 'Enter' && onEnter) { e.preventDefault(); onEnter() } }}
          style={{
            width: '100%', height: 56, boxSizing: 'border-box', border: 'none', outline: 'none',
            borderRadius: 'var(--r-md)', background: 'var(--surface-card)', boxShadow: ring,
            padding: showToggle ? '0 92px 0 16px' : '0 16px',
            color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 600,
            transition: 'box-shadow 160ms',
          }}
        />
        {showToggle && (
          <button
            type="button"
            aria-pressed={visible}
            onClick={() => setVisible(s => !s)}
            style={{
              position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', minHeight: 44, padding: '0 12px',
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, color: 'var(--text-mid)',
            }}
          >
            {visible ? t('authpage.hidePassword') : t('authpage.showPassword')}
          </button>
        )}
      </div>
      {error
        ? <p role="alert" style={{ margin: '6px 4px 0', fontSize: 13, color: 'var(--danger)', fontFamily: 'var(--font-body)' }}>{error}</p>
        : hint ? <p style={{ margin: '6px 4px 0', fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--font-body)' }}>{hint}</p> : null}
    </div>
  )
}
