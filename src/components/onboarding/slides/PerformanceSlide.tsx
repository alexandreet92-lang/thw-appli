'use client'
import { useState, useEffect } from 'react'
import { useI18n } from '@/lib/i18n'

const PTS = [18, 32, 27, 44, 40, 55, 50, 66]
const W = 280, H = 110, PAD_X = 4, PAD_Y = 8
const MAX_Y = 75
const chartH = H - PAD_Y * 2

function px(i: number) { return PAD_X + (i / (PTS.length - 1)) * (W - PAD_X * 2) }
function py(v: number) { return PAD_Y + chartH - (v / MAX_Y) * chartH }

const LINE = PTS.map((v, i) => `${i === 0 ? 'M' : 'L'}${px(i).toFixed(1)} ${py(v).toFixed(1)}`).join(' ')
const AREA = `${LINE} L${(W - PAD_X).toFixed(1)} ${H} L${PAD_X} ${H} Z`
const PATH_LEN = 520

function ChartMockup() {
  const { t } = useI18n()
  const [prog, setProg] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => {
      let p = 0
      const iv = setInterval(() => { p += 3; setProg(Math.min(p, 100)); if (p >= 100) clearInterval(iv) }, 20)
      return () => clearInterval(iv)
    }, 400)
    return () => clearTimeout(t)
  }, [])

  const kpis = [{ l: 'CTL', v: '68', u: '' }, { l: 'ATL', v: '74', u: '' }, { l: 'TSB', v: '-6', u: '' }]

  return (
    <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 18, padding: 18, width: '100%', maxWidth: 320, border: '1px solid rgba(255,255,255,0.08)' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {kpis.map(k => (
          <div key={k.l} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '8px 10px' }}>
            <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', margin: '0 0 2px', textTransform: 'uppercase', fontFamily: 'DM Sans, sans-serif' }}>{k.l}</p>
            <p style={{ fontSize: 20, fontWeight: 700, color: '#06B6D4', margin: 0, fontFamily: 'DM Mono, monospace' }}>{k.v}</p>
          </div>
        ))}
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id="obGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#06B6D4" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#06B6D4" stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={AREA} fill="url(#obGrad)" />
        <path d={LINE} fill="none" stroke="#06B6D4" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray={PATH_LEN} strokeDashoffset={PATH_LEN * (1 - prog / 100)}
          style={{ transition: 'stroke-dashoffset 0.04s linear' }} />
        {PTS.map((v, i) => {
          const threshold = (i / (PTS.length - 1)) * 100
          return prog >= threshold ? (
            <circle key={i} cx={px(i)} cy={py(v)} r={4} fill="#06B6D4" stroke="#0A0A0F" strokeWidth={2} />
          ) : null
        })}
      </svg>
      <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', margin: '6px 0 0', textAlign: 'right', fontFamily: 'DM Sans, sans-serif' }}>{t('onboarding.weeksN', { n: 8 })}</p>
    </div>
  )
}

export default function PerformanceSlide() {
  const { t } = useI18n()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '0 24px', gap: 28 }}>
      <ChartMockup />
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ fontSize: 26, fontWeight: 800, color: '#fff', margin: '0 0 10px', fontFamily: 'Syne, sans-serif' }}>{t('onboarding.perfTitle')}</h2>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.58)', lineHeight: 1.6, margin: 0, fontFamily: 'DM Sans, sans-serif' }}>{t('onboarding.perfSub1')}<br />{t('onboarding.perfSub2')}</p>
      </div>
    </div>
  )
}
