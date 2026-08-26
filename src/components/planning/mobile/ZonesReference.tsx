'use client'
// ══════════════════════════════════════════════════════════════════
// ZonesReference — rappel des zones de l'athlète, affiché JUSTE AU-DESSUS
// du profil d'intensité du builder (vélo & course). Objectif : le coach
// voit d'un coup d'œil où tombent les zones de puissance (Z2→Z7, vélo) ou
// d'allure (Z2→Z5, course) avant de caler ses blocs.
//
// Source des bornes : mêmes formules que la page Performance
// (powerZones / paceZones). Défauts « aucune donnée athlète » : FTP 200 W
// (vélo), VMA 12,8 km/h (course, ⇒ Z2 endurance ≈ 10 km/h / 6:00/km).
//
// Sous le tableau : 3 repères — vélo : SL1 · SL2 · FTP (W) ; course :
// SL1 · SL2 (allure /km). Couleurs de zone via zColor (source unique).
// ══════════════════════════════════════════════════════════════════
import type { SportType } from '@/app/planning/page'
import { powerZones, paceZones } from '@/app/performance/components/profil/zones'
import { zColor, secToPace, type AthleteRefs } from './editorial'

const FTP_DEFAULT = 200
const VMA_DEFAULT = 12.8   // km/h ⇒ Z2 (0,78·VMA) ≈ 10 km/h (6:00/km)

export function ZonesReference({ sport, refs }: { sport: SportType; refs: AthleteRefs }) {
  const isBike = sport === 'bike'
  const ftp = refs.ftp && refs.ftp > 0 ? refs.ftp : FTP_DEFAULT
  const vma = refs.vmaKmh && refs.vmaKmh > 0 ? refs.vmaKmh : VMA_DEFAULT

  // Vélo : Z2→Z7 (indices 1..6). Course : Z2→Z5 (indices 1..4). On saute Z1 récup.
  const zones = isBike
    ? powerZones(ftp).slice(1, 7).map((z, i) => ({ n: i + 2, label: z.label, range: z.range }))
    : paceZones(vma).slice(1, 5).map((z, i) => ({ n: i + 2, label: z.label, range: z.range }))

  const paceStr = (s: number | null | undefined) => (s && s > 0 ? `${secToPace(s)}/km` : '—')
  const wStr = (w: number | null | undefined) => (w && w > 0 ? `${w} W` : '—')

  const refItems = isBike
    ? [
        { k: 'SL1', v: wStr(refs.bikeSl1Watts) },
        { k: 'SL2', v: wStr(refs.bikeSl2Watts) },
        { k: 'FTP', v: `${ftp} W` },
      ]
    : [
        { k: 'SL1', v: paceStr(refs.runSl1PaceSec) },
        { k: 'SL2', v: paceStr(refs.runSl2PaceSec) },
      ]

  const rowLabel: React.CSSProperties = {
    fontSize: 11, color: 'var(--se-text)', fontWeight: 500, minWidth: 0,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  }

  return (
    <div data-testid="zones-reference" data-guide="builder-zones" style={{ border: '1px solid var(--se-rule)', borderRadius: 'var(--se-r)', padding: '12px 14px', marginBottom: 12 }}>
      <p style={{ margin: '0 0 8px', fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--se-dim)' }}>
        {isBike ? 'Zones de puissance' : "Zones d'allure"}
        <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}> · {isBike ? 'FTP' : 'seuil'} de l’athlète</span>
      </p>

      {/* Tableau des zones : filet coloré 3px + Zx + nom + borne (aligné à droite) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {zones.map(z => (
          <div key={z.n} data-zone={z.n} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ width: 3, alignSelf: 'stretch', minHeight: 14, borderRadius: 2, background: zColor(z.n), flexShrink: 0 }} />
            <span className="se-tnum" style={{ width: 20, fontSize: 10, fontWeight: 700, color: zColor(z.n), flexShrink: 0 }}>Z{z.n}</span>
            <span style={{ ...rowLabel, flex: 1 }}>{z.label}</span>
            <span className="se-tnum" style={{ fontSize: 11, fontWeight: 600, color: 'var(--se-text)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{z.range}</span>
          </div>
        ))}
      </div>

      {/* Repères SL1 · SL2 · (FTP) */}
      <div style={{ display: 'flex', gap: 16, marginTop: 10, paddingTop: 9, borderTop: '1px solid var(--se-rule)' }}>
        {refItems.map(it => (
          <div key={it.k} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={{ fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--se-dim)' }}>{it.k}</span>
            <span className="se-tnum" style={{ fontSize: 13, fontWeight: 600, color: 'var(--se-text)', fontVariantNumeric: 'tabular-nums' }}>{it.v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
