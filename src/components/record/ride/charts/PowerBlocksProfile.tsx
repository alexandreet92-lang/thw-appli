'use client'
// Profil des blocs de puissance d'une séance vélo/home trainer — SVG RAW (règle
// projet : zéro lib de chart). Une barre par bloc, largeur ∝ durée, hauteur ∝
// watts cible, couleur = zone de puissance (tokens --zone-1..7). Sert d'aperçu
// avant le lancement (résumé pré-séance). Aucune valeur en dur : tout vient du
// plan résolu + FTP athlète.
import { ZONES, zoneIndex } from '../zones'
import type { RidePlan } from '../types'
import { useI18n } from '@/lib/i18n'

interface Props { plan: RidePlan; ftp: number; height?: number }

export default function PowerBlocksProfile({ plan, ftp, height = 84 }: Props) {
  const { t } = useI18n()
  const blocks = plan.blocks.filter(b => b.t1 > b.t0)
  if (blocks.length === 0) return null
  const total = plan.totalS || blocks[blocks.length - 1].t1 || 1
  // Échelle verticale : 135 % FTP en repli, sinon la cible max (séance sans FTP
  // → cibles à 0, on garde une base à 1 pour éviter la division par zéro).
  const pmax = Math.max(ftp * 1.35, ...blocks.map(b => b.targetW), 1)
  const W = 1000, H = height, pad = 3, innerH = H - pad * 2

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height, display: 'block' }} role="img" aria-label={t('ride.powerProfile')}>
      {/* ligne de base FTP */}
      {ftp > 0 && (() => {
        const y = pad + innerH - (ftp / pmax) * innerH
        return <line x1={0} x2={W} y1={y} y2={y} stroke="var(--border-mid)" strokeWidth={1} strokeDasharray="4 4" />
      })()}
      {blocks.map((b, i) => {
        const x0 = (b.t0 / total) * W
        const x1 = (b.t1 / total) * W
        const zi = zoneIndex(b.targetW, ftp)
        const token = ZONES[zi].token
        // Cible à 0 (ex. bloc CP20) → petite barre repère en zone basse.
        const bh = b.targetW > 0 ? (b.targetW / pmax) * innerH : innerH * 0.14
        const w = Math.max(1.5, x1 - x0 - 1.5)
        return (
          <g key={i}>
            <rect x={x0} y={pad + innerH - bh} width={w} height={bh} fill={token} opacity={0.34} />
            <rect x={x0} y={pad + innerH - bh} width={w} height={2.5} fill={token} />
          </g>
        )
      })}
    </svg>
  )
}
