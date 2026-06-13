'use client'
// Affichage réutilisable « SM x · SN y » (chiffres NEUTRES, tabulaires) + « ? » d'aide.
// Pas de couleur sur les valeurs (couleur réservée aux courbes PMC). var() only.
import { InfoSmSn } from './InfoSmSn'

const FB = 'var(--font-body)'

export function SmSnStat({ sm, sn, info = true, size = 13 }: {
  sm: number | null
  sn: number | null
  info?: boolean
  size?: number
}) {
  const fmt = (v: number | null) => (v == null ? '—' : String(Math.round(v)))
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span className="tnum" style={{ fontFamily: FB, fontSize: size, color: 'var(--text-mid)' }}>
        SM <span style={{ color: 'var(--text)', fontWeight: 600 }}>{fmt(sm)}</span>
        <span style={{ color: 'var(--text-dim)' }}> · </span>
        SN <span style={{ color: 'var(--text)', fontWeight: 600 }}>{fmt(sn)}</span>
      </span>
      {info && <InfoSmSn />}
    </span>
  )
}
