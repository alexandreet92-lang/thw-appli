'use client'
import { useEffect, useState } from 'react'
import { useI18n } from '@/lib/i18n'

interface Stat { label: string; labelKey?: string; value: number | string; suffix: string; color?: string }
interface Props { config: Record<string, unknown> }

function Counter({ target, suffix }: { target: number; suffix: string }) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    const dur = 1200
    const start = Date.now()
    const tick = () => {
      const p = Math.min(1, (Date.now() - start) / dur)
      const ease = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(target * ease))
      if (p < 1) requestAnimationFrame(tick)
    }
    const raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target])
  return <>{val}{suffix}</>
}

export function StatsVisual({ config }: Props) {
  const { t } = useI18n()
  const stats = config.stats as Stat[]

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 16px', flexWrap: 'wrap' }}>
      {stats.map(({ label, labelKey, value, suffix, color }, i) => (
        <div key={label} style={{ flex: 1, minWidth: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: '16px 8px', opacity: 0, animation: `count-up 400ms ${i * 150}ms ease forwards` }}>
          <span style={{ fontSize: 28, fontWeight: 800, color: color ?? '#06B6D4', fontFamily: 'DM Mono, monospace', letterSpacing: '-0.02em', lineHeight: 1 }}>
            {typeof value === 'number' ? <Counter target={value} suffix={suffix} /> : <>{value}{suffix}</>}
          </span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textAlign: 'center', fontFamily: 'DM Sans, sans-serif' }}>{labelKey ? t(labelKey) : label}</span>
        </div>
      ))}
    </div>
  )
}
