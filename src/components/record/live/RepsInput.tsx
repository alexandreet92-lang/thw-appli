'use client'
// Deux cartes de saisie (répétitions / charge) posées sur le fond d'effort.
// Steppers ± et tap sur la valeur → pavé numérique. « PDC » tant que charge = 0
// sur un exercice au poids du corps ; dès qu'on ajoute du poids, passe en kg.
interface Props {
  reps: number
  kg: number
  bodyweight: boolean
  targetReps: number
  targetKg: number
  onNudgeReps: (d: number) => void
  onNudgeKg: (d: number) => void
  onOpenPad: (target: 'reps' | 'kg') => void
}

const card: React.CSSProperties = {
  flex: 1, background: 'rgba(0,0,0,0.28)', border: '1px solid rgba(255,255,255,0.28)', borderRadius: 20,
  padding: '12px 8px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
}
const stp: React.CSSProperties = {
  width: 46, height: 46, borderRadius: 14, border: '2px solid currentColor', background: 'transparent',
  color: 'inherit', fontSize: 26, fontWeight: 800, display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0,
}
const cl: React.CSSProperties = { fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 800, opacity: 0.85 }

export default function RepsInput(p: Props) {
  return (
    <div style={{ display: 'flex', gap: 12, marginTop: 22, width: '100%', maxWidth: 350 }}>
      <div style={card}>
        <span style={cl}>Répétitions</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', justifyContent: 'center' }}>
          <button aria-label="moins" style={stp} onClick={() => p.onNudgeReps(-1)}>−</button>
          <span onClick={() => p.onOpenPad('reps')} style={{ flex: 1, textAlign: 'center', fontSize: 48, fontWeight: 800, cursor: 'pointer', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{p.reps}</span>
          <button aria-label="plus" style={stp} onClick={() => p.onNudgeReps(1)}>+</button>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.7 }}>cible {p.targetReps}</span>
      </div>

      <div style={card}>
        <span style={cl}>Charge</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', justifyContent: 'center' }}>
          <button aria-label="moins" style={{ ...stp, opacity: p.bodyweight ? 0.4 : 1 }} onClick={() => p.onNudgeKg(-1)}>−</button>
          <span onClick={() => p.onOpenPad('kg')} style={{ flex: 1, textAlign: 'center', fontSize: p.bodyweight ? 30 : 48, fontWeight: 800, cursor: 'pointer', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{p.bodyweight ? 'PDC' : p.kg}</span>
          <button aria-label="plus" style={stp} onClick={() => p.onNudgeKg(1)}>+</button>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.7 }}>{p.bodyweight ? 'poids du corps' : `cible ${p.targetKg} kg`}</span>
      </div>
    </div>
  )
}
