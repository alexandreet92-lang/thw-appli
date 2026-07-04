'use client'
import { useI18n } from '@/lib/i18n'

const ACTIONS = [
  { label: 'onboarding.g.quickActions.trainingPlan',  model: 'Zeus',   icon: '📋' },
  { label: 'onboarding.g.quickActions.weakPoints',    model: 'Athéna', icon: '🎯' },
  { label: 'onboarding.g.quickActions.nutritionPlan', model: 'Athéna', icon: '🥗' },
  { label: 'onboarding.g.quickActions.appGuide',      model: 'Hermès', icon: '💡' },
  { label: 'onboarding.g.quickActions.trainingAnalysis', model: 'Athéna', icon: '📊' },
  { label: 'onboarding.g.quickActions.raceStrategy',  model: 'Athéna', icon: '🏁' },
]

export const QUICK_ACTIONS_META = {
  badge: 'onboarding.g.quickActions.badge',
  title: 'onboarding.g.quickActions.title',
  description: 'onboarding.g.quickActions.desc',
  keyPoints: [
    'onboarding.g.quickActions.kp1',
    'onboarding.g.quickActions.kp2',
    'onboarding.g.quickActions.kp3',
  ],
}

export function QuickActionsVisual() {
  const { t } = useI18n()
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, padding: '0 4px' }}>
      <style>{`
        @keyframes go-scale-in { from { transform: scale(0.6); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>
      {ACTIONS.map((a, i) => (
        <div key={i} style={{
          padding: '12px', borderRadius: 14,
          background: 'rgba(249,115,22,0.07)',
          border: '1px solid rgba(249,115,22,0.2)',
          animation: `go-scale-in 0.3s ${i * 0.07}s cubic-bezier(0.34,1.56,0.64,1) both`,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'rgba(249,115,22,0.14)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 8, fontSize: 16,
          }}>
            {a.icon}
          </div>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'white', margin: '0 0 3px', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.3 }}>{t(a.label)}</p>
          <p style={{ fontSize: 10, color: 'rgba(249,115,22,0.7)', margin: 0, fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>{a.model}</p>
        </div>
      ))}
    </div>
  )
}
