'use client'
// ════════════════════════════════════════════════════════════════════
// ExitSheet — bottom sheet de sortie pendant l'enregistrement (spec §6).
// « Enregistrement en cours » · durée + distance · Reprendre (aussi tap hors
// sheet) · Terminer et sauvegarder · Supprimer l'activité en DEUX TEMPS
// (1er tap → confirmation fond danger 3 s, 2e tap exécute).
// Aucun alert()/confirm().
// ════════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState } from 'react'
import { formatHMS, frNum } from './liveMachine'

interface Props {
  open: boolean
  durationSec: number
  distanceM: number
  onResume: () => void
  onFinish: () => void
  onDelete: () => void
}

export default function ExitSheet({ open, durationSec, distanceM, onResume, onFinish, onDelete }: Props) {
  const [armed, setArmed] = useState(false)
  const armTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const disarm = () => {
    setArmed(false)
    if (armTimer.current) { clearTimeout(armTimer.current); armTimer.current = null }
  }

  useEffect(() => {
    if (!open) disarm()
    return () => { if (armTimer.current) clearTimeout(armTimer.current) }
  }, [open])

  if (!open) return null

  const handleDelete = () => {
    if (!armed) {
      setArmed(true)
      armTimer.current = setTimeout(() => setArmed(false), 3000)
      return
    }
    disarm()
    onDelete()
  }

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 70 }}>
      {/* Tap hors sheet = Reprendre */}
      <div onClick={() => { disarm(); onResume() }} style={{ position: 'absolute', inset: 0, background: 'var(--live-veil)' }} />
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: 'var(--live-surface)',
        borderRadius: '28px 28px 0 0',
        borderTop: '1px solid var(--live-hairline-2)',
        padding: '12px 20px calc(env(safe-area-inset-bottom) + 34px)',
        textAlign: 'center',
        animation: 'lv2SheetUp 0.26s ease-out',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--live-dim)', margin: '0 auto 22px' }} />
        <h2 style={{ fontSize: 19, fontWeight: 800, margin: 0 }}>Enregistrement en cours</h2>
        <p className="lv2-num" style={{ fontSize: 13.5, color: 'var(--live-text-2)', margin: '8px 0 22px', fontWeight: 500 }}>
          {formatHMS(durationSec, true)} · {frNum(distanceM / 1000, 1)} km — activité non sauvegardée
        </p>
        <button className="lv2-pill lv2-pill-primary lv2-press" style={{ marginBottom: 12 }} onClick={() => { disarm(); onResume() }}>
          Reprendre
        </button>
        <button className="lv2-pill lv2-pill-ghost lv2-press" style={{ marginBottom: 12 }} onClick={() => { disarm(); onFinish() }}>
          Terminer et sauvegarder
        </button>
        <button
          className={armed ? 'lv2-pill lv2-pill-danger lv2-armed lv2-press' : 'lv2-pill lv2-pill-danger lv2-press'}
          onClick={handleDelete}
        >
          {armed ? `Confirmer — supprimer ${frNum(distanceM / 1000, 1)} km ?` : 'Supprimer l’activité'}
        </button>
      </div>
    </div>
  )
}
