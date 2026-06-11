'use client'
// Donut kcal (SVG brut, aucune lib) : chiffre kcal NEUTRE au centre, anneau réparti par
// macro (Protéines/Glucides/Lipides) selon leur contribution calorique (P×4,G×4,L×9).
// Couleurs macros = exception assumée (tokens --macro-*), jamais sur les chiffres.

interface Props { kcal: number; prot: number; gluc: number; lip: number; size?: number; label?: string }

const MACROS = [
  { key: 'prot', color: 'var(--macro-prot)', k: 4 },
  { key: 'gluc', color: 'var(--macro-gluc)', k: 4 },
  { key: 'lip', color: 'var(--macro-lip)', k: 9 },
] as const

export function MacroDonut({ kcal, prot, gluc, lip, size = 72, label }: Props) {
  const sw = Math.max(6, size * 0.13)
  const r = (size - sw) / 2
  const c = 2 * Math.PI * r
  const grams = { prot, gluc, lip }
  const kcals = MACROS.map(m => Math.max(0, grams[m.key]) * m.k)
  const totalK = kcals.reduce((a, b) => a + b, 0)
  const empty = totalK <= 0

  let acc = 0
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-card2)" strokeWidth={sw} />
        {!empty && MACROS.map((m, i) => {
          const frac = kcals[i] / totalK
          const dash = frac * c
          const seg = (
            <circle key={m.key} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={m.color}
              strokeWidth={sw} strokeDasharray={`${dash} ${c - dash}`} strokeDashoffset={-acc}
              strokeLinecap="butt" style={{ transition: 'stroke-dasharray 0.5s ease, stroke-dashoffset 0.5s ease' }} />
          )
          acc += dash
          return seg
        })}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0 }}>
        <span className="tnum" style={{ fontFamily: 'var(--font-body)', fontSize: size * 0.26, fontWeight: 600, color: empty ? 'var(--text-dim)' : 'var(--text)', lineHeight: 1 }}>{Math.round(kcal)}</span>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: size * 0.13, color: 'var(--text-dim)' }}>{label ?? 'kcal'}</span>
      </div>
    </div>
  )
}
