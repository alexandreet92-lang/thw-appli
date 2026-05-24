'use client'

interface ThemeColors { bg: string; text: string; dim: string; separator: string; cardBg: string }

export interface ClimbData {
  totalDistance: number    // km
  totalElevation: number   // m
  currentPosition: number  // km depuis début
  currentGradient: number  // %
  elevationProfile: number[] // 0..1 normalisé
}

function buildProfilePath(profile: number[]): string {
  if (profile.length < 2) return 'M 0 40 L 100 40 Z'
  const n = profile.length
  const segs = profile.map((v, i) => {
    const x = (i / (n - 1)) * 100
    const y = (1 - Math.max(0, Math.min(1, v))) * 40
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
  })
  return `${segs.join(' ')} L 100 40 L 0 40 Z`
}
function getElevationAtProgress(profile: number[], progress: number): number {
  if (profile.length === 0) return 1
  const idx = Math.min(profile.length - 1, Math.max(0, Math.floor(progress * (profile.length - 1))))
  const v = profile[idx]
  return 1 - Math.max(0, Math.min(1, v))
}

interface Props { data: ClimbData | null; theme: ThemeColors }

export function ClimbProfile({ data, theme }: Props) {
  if (!data) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100%', color: theme.dim, fontSize: 12, textAlign: 'center', padding: 8,
      }}>
        Aucune montée détectée
      </div>
    )
  }
  const progress    = data.totalDistance > 0 ? Math.min(1, data.currentPosition / data.totalDistance) : 0
  const remainingKm   = (data.totalDistance - data.currentPosition).toFixed(1)
  const remainingElev = Math.round(data.totalElevation * (1 - progress))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '8px 12px' }}>
      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 40">
          <defs>
            <linearGradient id="climbGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#06B6D4" stopOpacity={0.40}/>
              <stop offset="100%" stopColor="#06B6D4" stopOpacity={0.05}/>
            </linearGradient>
          </defs>
          <path d={buildProfilePath(data.elevationProfile)} fill="url(#climbGrad)" stroke="#06B6D4" strokeWidth={0.8}/>
          <line x1={progress * 100} y1={0} x2={progress * 100} y2={40}
                stroke="#06B6D4" strokeWidth={1.5} strokeDasharray="2 1"/>
          <circle cx={progress * 100}
                  cy={getElevationAtProgress(data.elevationProfile, progress) * 40}
                  r={2} fill="#06B6D4"/>
        </svg>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6 }}>
        <ClimbStat label="Restant"   value={remainingKm}   unit="km" t={theme}/>
        <ClimbStat label="D+ rest."  value={`${remainingElev}`} unit="m"  t={theme}/>
        <ClimbStat label="Pente"     value={data.currentGradient.toFixed(1)} unit="%" t={theme}/>
      </div>
    </div>
  )
}

function ClimbStat({ label, value, unit, t }: { label: string; value: string; unit: string; t: ThemeColors }) {
  return (
    <div style={{ textAlign: 'center', flex: 1 }}>
      <p style={{ fontSize: 9, color: t.dim, margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
      <p style={{ fontSize: 16, fontWeight: 700, color: t.text, margin: 0, fontFamily: 'DM Mono, monospace' }}>{value}</p>
      <p style={{ fontSize: 9, color: t.dim, margin: 0 }}>{unit}</p>
    </div>
  )
}

export default ClimbProfile
