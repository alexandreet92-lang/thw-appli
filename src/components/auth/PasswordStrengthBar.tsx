'use client'

// Jauge de robustesse — 8 segments, indicative (ne bloque rien). Tokens only.
const LABELS = ['', 'Très faible', 'Faible', 'Correct', 'Bon', 'Solide', 'Fort', 'Excellent', 'Excellent']
const COLORS = [
  'transparent', 'var(--charge-hard)', 'var(--charge-hard)', 'var(--charge-mid)',
  'var(--charge-mid)', 'var(--charge-low)', 'var(--charge-low)', 'var(--primary)', 'var(--primary)',
]

function score(pwd: string): number {
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
  if (!password) return null
  const s = score(password)
  const color = COLORS[s]
  return (
    <div style={{ marginTop: -6, marginBottom: 14 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 5 }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 2,
            background: i < s ? color : 'var(--border)',
            transition: 'background 250ms',
          }} />
        ))}
      </div>
      <p style={{ fontSize: 11, color, margin: 0, fontFamily: 'var(--font-body)' }}>{LABELS[s]}</p>
    </div>
  )
}
