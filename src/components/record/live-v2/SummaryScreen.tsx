'use client'
// ════════════════════════════════════════════════════════════════════
// SummaryScreen — écran de résumé plein écran après l'arrêt (spec §6-7).
// Mini-carte SVG du tracé RÉEL (cadrage auto bounding box), grille 2×5 dont
// SM/SN via le moteur de charge existant (lib/metrics/smSn), pied Enregistrer
// (→ jauge d'envoi réelle) + Supprimer (deux temps). Navigation arrière
// bloquée tant que la séance n'est ni enregistrée ni supprimée (portal plein
// écran + garde sur la croix dans LiveShell).
// ════════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSmSn } from '@/hooks/useSmSn'
import { formatHMS, frNum } from './liveMachine'
import { uploadLiveSession } from './saveLive'
import { clearLiveBackup, type LiveSnapshot } from './useLocalBackup'
import UploadGauge, { type UploadGaugeState } from './UploadGauge'

interface Props {
  snap: LiveSnapshot
  onUploadStart: () => void
  onUploadDone: () => void
  onUploadFail: () => void
  onDiscard: () => void
  /** Callback historique de fin (nettoyage de la page record) — avant navigation. */
  onFinished: () => void
}

const MAP_W = 358
const MAP_H = 186
const MAP_PAD = 18

/** Projette les points GPS dans la mini-carte (équirectangulaire, cadrage auto). */
function projectTrack(pts: { lat: number; lng: number }[]): [number, number][] {
  if (pts.length === 0) return []
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity
  for (const p of pts) {
    if (p.lat < minLat) minLat = p.lat
    if (p.lat > maxLat) maxLat = p.lat
    if (p.lng < minLng) minLng = p.lng
    if (p.lng > maxLng) maxLng = p.lng
  }
  const midLat = (minLat + maxLat) / 2
  const kx = Math.cos(midLat * Math.PI / 180)
  const spanX = Math.max((maxLng - minLng) * kx, 1e-6)
  const spanY = Math.max(maxLat - minLat, 1e-6)
  const scale = Math.min((MAP_W - 2 * MAP_PAD) / spanX, (MAP_H - 2 * MAP_PAD) / spanY)
  const w = spanX * scale
  const h = spanY * scale
  const ox = (MAP_W - w) / 2
  const oy = (MAP_H - h) / 2
  return pts.map(p => [
    ox + ((p.lng - minLng) * kx) * scale,
    oy + (maxLat - p.lat) * scale,
  ])
}

export default function SummaryScreen({ snap, onUploadStart, onUploadDone, onUploadFail, onDiscard, onFinished }: Props) {
  const router = useRouter()
  const { compute } = useSmSn()

  const [foot, setFoot] = useState<'buttons' | UploadGaugeState>('buttons')
  const [progress, setProgress] = useState(0)
  const [armed, setArmed] = useState(false)
  const armTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedIdRef = useRef<string | null>(null)
  useEffect(() => () => { if (armTimer.current) clearTimeout(armTimer.current) }, [])

  const started = new Date(snap.startedAtISO)
  const dateLine = `${started.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} · ${started.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`

  // Décimation légère de la trace pour un SVG fluide (max ~600 points).
  const track = useMemo(() => {
    const pts = snap.gpsPts
    if (pts.length <= 600) return projectTrack(pts)
    const step = Math.ceil(pts.length / 600)
    const dec = pts.filter((_, i) => i % step === 0)
    if (dec[dec.length - 1] !== pts[pts.length - 1]) dec.push(pts[pts.length - 1])
    return projectTrack(dec)
  }, [snap.gpsPts])
  const polyline = track.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')

  // SM/SN via le calcul de charge existant (déterministe).
  const smsn = useMemo(() => compute({
    sport_type: 'bike',
    moving_time_s: snap.durationSec,
    distance_m: snap.distM,
    elevation_gain_m: snap.elevM,
    avg_hr: null,
  }), [compute, snap.durationSec, snap.distM, snap.elevM])

  const runUpload = async () => {
    setFoot('uploading')
    setProgress(0)
    onUploadStart()
    try {
      const id = await uploadLiveSession(snap, setProgress)
      savedIdRef.current = id
      clearLiveBackup()
      // 100 % affiché 350 ms avant la confirmation (spec §7).
      setTimeout(() => { setFoot('done'); onUploadDone() }, 350)
    } catch (e) {
      console.error('[live-v2] upload error:', e)
      setFoot('failed')
      onUploadFail()
    }
  }

  const handleDelete = () => {
    if (foot !== 'buttons') return
    if (!armed) {
      setArmed(true)
      armTimer.current = setTimeout(() => setArmed(false), 3000)
      return
    }
    if (armTimer.current) clearTimeout(armTimer.current)
    setArmed(false)
    onDiscard()
  }

  const seeTraining = () => {
    onFinished()
    const id = savedIdRef.current
    router.push(id ? `/activities?new=${id}` : '/activities')
  }

  const rows: { label: string; value: string; unit?: string }[][] = [
    [
      { label: 'Durée', value: formatHMS(snap.durationSec, true) },
      { label: 'Distance', value: frNum(snap.distM / 1000, 2), unit: 'km' },
    ],
    [
      { label: 'D+', value: String(Math.round(snap.elevM)), unit: 'm' },
      { label: 'Vitesse moy', value: frNum(snap.avgSpeedKmh, 1), unit: 'km/h' },
    ],
    [
      { label: 'Watts moy', value: '—', unit: 'W' },
      { label: 'Watts norm.', value: '—', unit: 'W' },
    ],
    [
      { label: 'FC moy', value: '—', unit: 'bpm' },
      { label: 'Cadence moy', value: '—', unit: 'rpm' },
    ],
    [
      { label: 'SM', value: String(smsn.sm) },
      { label: 'SN', value: String(smsn.sn) },
    ],
  ]

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 66,
      background: 'var(--live-bg)',
      display: 'flex', flexDirection: 'column',
      paddingTop: 'calc(env(safe-area-inset-top) + 8px)',
      animation: 'lv2FadeIn 0.25s ease-out',
      overflowY: 'auto',
    }}>
      {/* En-tête */}
      <div style={{ textAlign: 'center', padding: '18px 0 14px', flexShrink: 0 }}>
        <h2 style={{ fontSize: 19, fontWeight: 800, margin: 0 }}>Résumé de la séance</h2>
        <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--live-text-2)', marginTop: 4 }}>{dateLine}</div>
      </div>

      {/* Mini-carte du tracé réel (SVG, cadrage auto) */}
      <div style={{
        margin: '2px 16px 0', height: MAP_H, borderRadius: 20, overflow: 'hidden',
        position: 'relative', flexShrink: 0,
        background: 'var(--live-map-bg)', border: '1px solid var(--live-hairline)',
      }}>
        {track.length > 1 ? (
          <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style={{ display: 'block' }}>
            <polyline
              points={polyline}
              fill="none"
              stroke="var(--live-accent)"
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Départ vert / arrivée rouge, cœur blanc */}
            <circle cx={track[0][0]} cy={track[0][1]} r="6" fill="var(--live-success)" />
            <circle cx={track[0][0]} cy={track[0][1]} r="2.6" fill="#fff" /> {/* design-allow-color */}
            <circle cx={track[track.length - 1][0]} cy={track[track.length - 1][1]} r="6" fill="var(--live-danger)" />
            <circle cx={track[track.length - 1][0]} cy={track[track.length - 1][1]} r="2.6" fill="#fff" /> {/* design-allow-color */}
          </svg>
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--live-label)' }}>
            Aucun tracé GPS
          </div>
        )}
      </div>

      {/* Grille 2×5 */}
      <div className="lv2-grid" style={{ marginTop: 14, flexShrink: 0 }}>
        {rows.map((row, i) => (
          <div className="lv2-row" key={i}>
            {row.map(c => (
              <div className="lv2-cell" key={c.label} style={{ padding: '15px 6px 17px' }}>
                <div className="lv2-eyebrow">{c.label}</div>
                <div className="lv2-v">
                  <span className="lv2-n lv2-num" style={{ fontSize: 29 }}>{c.value}</span>
                  {c.unit && <span className="lv2-u">{c.unit}</span>}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Pied : boutons / jauge d'envoi / confirmation */}
      <div style={{ marginTop: 'auto', padding: '18px 20px calc(env(safe-area-inset-bottom) + 30px)', textAlign: 'center', flexShrink: 0 }}>
        {foot === 'buttons' ? (
          <>
            <button className="lv2-pill lv2-pill-primary lv2-press" style={{ marginBottom: 12 }} onClick={runUpload}>
              Enregistrer la séance
            </button>
            <button
              className={armed ? 'lv2-pill lv2-pill-danger lv2-armed lv2-press' : 'lv2-pill lv2-pill-danger lv2-press'}
              onClick={handleDelete}
            >
              {armed ? `Confirmer — supprimer ${frNum(snap.distM / 1000, 1)} km ?` : 'Supprimer l’activité'}
            </button>
          </>
        ) : (
          <UploadGauge state={foot} progress={progress} onRetry={runUpload} onSeeTraining={seeTraining} />
        )}
      </div>
    </div>
  )
}
