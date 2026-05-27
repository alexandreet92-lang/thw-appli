'use client'

interface Props { current: number; total: number }

export function ProgressBar({ current, total }: Props) {
  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0,
      height: 2, background: 'rgba(255,255,255,0.08)', zIndex: 10,
    }}>
      <div style={{
        height: '100%',
        width: `${((current + 1) / total) * 100}%`,
        background: 'linear-gradient(90deg, #06B6D4, #2563EB)',
        transition: 'width 400ms cubic-bezier(0.16,1,0.3,1)',
        boxShadow: '0 0 8px rgba(6,182,212,0.6)',
      }} />
    </div>
  )
}
