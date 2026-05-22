'use client'

interface MealConfirmCardProps {
  mealName: string
  calories: number
  protein:  number
  visible:  boolean
  onHide:   () => void
}

export default function MealConfirmCard({ mealName, calories, protein, visible }: MealConfirmCardProps) {
  return (
    <div style={{
      position: 'fixed',
      bottom: 96,
      left: '50%',
      transform: `translateX(-50%) translateY(${visible ? '0' : '16px'})`,
      zIndex: 200,
      opacity: visible ? 1 : 0,
      pointerEvents: visible ? 'auto' : 'none',
      transition: 'opacity 300ms ease, transform 300ms ease',
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 16,
      boxShadow: '0 8px 32px rgba(0,0,0,0.28)',
      padding: '12px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      minWidth: 210,
      maxWidth: 290,
      whiteSpace: 'nowrap',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        background: 'rgba(16,185,129,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none"
          stroke="#10B981" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" style={{
            strokeDasharray: 22,
            strokeDashoffset: visible ? 0 : 22,
            transition: 'stroke-dashoffset 300ms ease-out 80ms',
          }} />
        </svg>
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: 0, fontFamily: 'Syne,sans-serif', fontWeight: 600, fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {mealName}
        </p>
        <p style={{ margin: 0, fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
          {calories} kcal · P {protein}g
        </p>
      </div>
    </div>
  )
}
