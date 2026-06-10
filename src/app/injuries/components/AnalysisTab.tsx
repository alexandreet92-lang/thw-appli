'use client'
// Onglet Analyse : stats 12 mois (réelles) + corrélation charge (indisponible V1 :
// le hook useTrainingLoad n'existe pas encore — état honnête, pas de donnée inventée).
import { type Injury } from '../types'
import { stats12mo } from '../lib'

const FB = 'var(--font-body)', FD = 'var(--font-display)'
const lbl: React.CSSProperties = { fontFamily: FB, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-dim)', margin: 0 }

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div style={{ flex: 1, minWidth: 140 }}>
      <p style={lbl}>{label}</p>
      <p className="tnum" style={{ fontFamily: FB, fontSize: 22, fontWeight: 600, color: 'var(--text)', margin: 'var(--space-1) 0 0' }}>{value}</p>
      <p style={{ fontFamily: FB, fontSize: 11, color: 'var(--text-mid)', margin: 'var(--space-1) 0 0' }}>{sub}</p>
    </div>
  )
}

export function AnalysisTab({ injuries }: { injuries: Injury[] }) {
  const s = stats12mo(injuries)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
      <div style={{ display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap' }}>
        <Stat label="Blessures (12 m)" value={`${s.count}`} sub="épisodes signalés" />
        <Stat label="Durée moy. indispo" value={s.avgDuration == null ? '—' : `${s.avgDuration} j`} sub="par épisode" />
        <Stat label="Taux de récidive" value={s.recidiveRate == null ? '—' : `${s.recidiveRate}%`} sub="même zone déjà touchée" />
        <Stat label="Délai retour moyen" value={s.avgReturn == null ? '—' : `${s.avgReturn} j`} sub="épisodes résolus" />
      </div>
      <div>
        <h2 style={{ fontFamily: FD, fontSize: 17, fontWeight: 500, color: 'var(--text)', margin: 0 }}>Blessure × charge d&apos;entraînement</h2>
        <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)', margin: 'var(--space-1) 0 var(--space-2)' }}>Tes blessures suivent-elles tes pics de charge ?</p>
        <p style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.5, margin: 0 }}>
          La charge d&apos;entraînement (CTL) n&apos;est pas encore exposée à l&apos;app. Ce module s&apos;activera quand
          le hook de charge sera disponible — rien n&apos;est estimé en attendant.
        </p>
      </div>
    </div>
  )
}
