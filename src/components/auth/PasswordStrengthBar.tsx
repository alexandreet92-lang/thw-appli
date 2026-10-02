'use client'
import { useI18n } from '@/lib/i18n'

// Jauge de robustesse — barre continue qui se remplit (indicative, ne bloque
// rien). Couleurs sémantiques de charge (tokens), libellé à droite.
const LABEL_KEYS = ['', 'authpage.pwVeryWeak', 'authpage.pwWeak', 'authpage.pwOk', 'authpage.pwGood', 'authpage.pwSolid', 'authpage.pwStrong', 'authpage.pwExcellent', 'authpage.pwExcellent']
const COLORS = [
  'var(--border-mid)', 'var(--charge-hard)', 'var(--charge-hard)', 'var(--charge-mid)',
  'var(--charge-mid)', 'var(--charge-low)', 'var(--charge-low)', 'var(--charge-low)', 'var(--charge-low)',
]

export function passwordScore(pwd: string): number {
  let s = 0
  if (pwd.length >= 8) s++
  if (pwd.length >= 12) s++
  if (/[a-z]/.test(pwd)) s++
  if (/[A-Z]/.test(pwd)) s++
  if (/[0-9]/.test(pwd)) s++
  if (/[^A-Za-z0-9]/.test(pwd)) s++
  if (pwd.length >= 16) s++
  if (/[^A-Za-z0-9].*[^A-Za-z0-9]/.test(pwd)) s++
  return Math.min(8, s)
}

export function PasswordStrengthBar({ password }: { password: string }) {
  const { t } = useI18n()
  if (!password) return null
  const s = passwordScore(password)
  const color = COLORS[s]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '-4px 4px 14px' }}>
      <div style={{ flex: 1, height: 4, borderRadius: 'var(--r-pill)', background: 'var(--surface-chip)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.max(8, (s / 8) * 100)}%`, background: color, borderRadius: 'var(--r-pill)', transition: 'width 0.35s cubic-bezier(.22,1,.36,1), background 0.25s' }} />
      </div>
      <span style={{ minWidth: 64, textAlign: 'right', fontSize: 12, fontWeight: 600, color: 'var(--text-mid)', fontFamily: 'var(--font-body)' }}>{s > 0 ? t(LABEL_KEYS[s]) : ''}</span>
    </div>
  )
}
