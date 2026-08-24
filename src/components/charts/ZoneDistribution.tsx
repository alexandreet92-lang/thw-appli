'use client'
// Répartition par zones d'intensité — barre empilée Z1→Z5 (écart 2px), % direct,
// temps au survol, indice de polarisation (Polarisé / Pyramidal / Seuil) et
// comparaison à une cible optionnelle.
import { INK, ZONE, fmtDuration, fmtPct } from './theme'

export interface ZoneDistProps {
  seconds: number[]          // 5 valeurs : temps (s) par zone Z1..Z5
  target?: number[]          // 5 valeurs : % cible par zone (optionnel)
  height?: number
  showModel?: boolean        // afficher le verdict de distribution
}

const Z_LABEL = ['Z1', 'Z2', 'Z3', 'Z4', 'Z5']

export function polarizationVerdict(sec: number[]): { label: string; color: string } {
  const tot = sec.reduce((s, x) => s + x, 0) || 1
  const low = (sec[0] + sec[1]) / tot, mid = sec[2] / tot, high = (sec[3] + sec[4]) / tot
  if (low >= 0.7 && high >= 0.12 && mid <= 0.12) return { label: 'Polarisé', color: '#10B981' }
  if (low > mid && mid > high && high > 0) return { label: 'Pyramidal', color: '#3B82F6' }
  if (mid >= 0.3) return { label: 'Axé seuil/tempo', color: '#F97316' }
  return { label: 'Base aérobie', color: '#8B5CF6' }
}

export function ZoneDistribution({ seconds, target, height = 34, showModel = true }: ZoneDistProps) {
  const tot = seconds.reduce((s, x) => s + Math.max(0, x), 0)
  const pct = seconds.map(s => tot > 0 ? (Math.max(0, s) / tot) * 100 : 0)
  const verdict = polarizationVerdict(seconds)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* barre empilée */}
      <div style={{ display: 'flex', gap: 2, height, borderRadius: 8, overflow: 'hidden' }}>
        {pct.map((p, i) => p > 0 && (
          <div key={i} title={`${Z_LABEL[i]} · ${fmtDuration(seconds[i])} (${fmtPct(p)})`}
            style={{ width: `${p}%`, background: ZONE[i], display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: p > 6 ? 0 : 2 }}>
            {p >= 9 && <span style={{ fontSize: 11, fontWeight: 800, color: '#fff' }}>{Math.round(p)}%</span>}
          </div>
        ))}
        {tot === 0 && <div style={{ flex: 1, background: INK.surface2 }} />}
      </div>

      {/* cible (comparaison) */}
      {target && (
        <div>
          <div style={{ display: 'flex', gap: 2, height: 8, borderRadius: 4, overflow: 'hidden', opacity: 0.85 }}>
            {target.map((p, i) => p > 0 && <div key={i} title={`Cible ${Z_LABEL[i]} · ${fmtPct(p)}`} style={{ width: `${p}%`, background: ZONE[i] }} />)}
          </div>
          <span style={{ fontSize: 9.5, color: INK.dim }}>Cible</span>
        </div>
      )}

      {/* légende + verdict */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        {Z_LABEL.map((z, i) => (
          <span key={z} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
            <span style={{ width: 9, height: 9, borderRadius: 2.5, background: ZONE[i] }} />
            <span style={{ color: INK.mid, fontWeight: 600 }}>{z}</span>
            <span className="tabular-nums" style={{ color: INK.text, fontWeight: 700 }}>{Math.round(pct[i])}%</span>
          </span>
        ))}
        {showModel && tot > 0 && (
          <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 999, background: `${verdict.color}1a`, border: `1px solid ${verdict.color}55` }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: verdict.color }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: verdict.color }}>{verdict.label}</span>
          </span>
        )}
      </div>
    </div>
  )
}
