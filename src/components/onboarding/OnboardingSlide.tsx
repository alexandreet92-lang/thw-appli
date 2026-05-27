'use client'
import { useEffect, useState } from 'react'

interface Props {
  children: React.ReactNode
  direction: number
  slideKey: number
}

export default function OnboardingSlide({ children, direction, slideKey }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(t)
  }, [slideKey])

  const startX = direction >= 0 ? '40px' : '-40px'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        transform: visible ? 'translateX(0)' : `translateX(${startX})`,
        opacity: visible ? 1 : 0,
        transition: 'transform 320ms cubic-bezier(0.16,1,0.3,1), opacity 280ms ease',
      }}
    >
      {children}
    </div>
  )
}
