'use client'
// ══════════════════════════════════════════════════════════════════════════
// Analyse complète d'une activité PARTAGÉE dans un canal — mêmes fonctionnalités
// que la page training de l'athlète (carte interactive, courbes avec curseur +
// sélection, zones FC/allure, comparatif d'intervalles, tours cliquables), mais
// 100 % LECTURE SEULE (readOnly masque : IA, photos, suppression, badges EF/SL,
// toute édition). Données hydratées via la RPC sécurisée réservée aux membres de
// l'espace ; masques de confidentialité de l'athlète respectés.
// Repli : si le détail n'est pas disponible, on affiche la surpage snapshot.
// ══════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ActivityDetail } from '@/app/activities/page'
import { getSharedActivityDetail, type SharedActivityRow } from '@/lib/community/sharedActivity'
import { ActivityDetailPanel } from './ActivityDetailPanel'
import type { ActivityRef } from '@/types/community'

const EMPTY_PROFILE = { weight_kg: null, birth_date: null }

export function CommunityActivityAnalysis({ activity, channelId, onClose }: { activity: ActivityRef; channelId: string; onClose: () => void }) {
  const [row, setRow] = useState<SharedActivityRow | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'fallback'>('loading')
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    let off = false
    setState('loading'); setRow(null)
    void getSharedActivityDetail(activity.id, channelId)
      .then(r => { if (off) return; if (r) { setRow(r); setState('ready') } else setState('fallback') })
      .catch(() => { if (!off) setState('fallback') })
    return () => { off = true }
  }, [activity.id, channelId])

  // Repli : surpage snapshot (carte + stats + profil altimétrique).
  if (state === 'fallback') return <ActivityDetailPanel activity={activity} onClose={onClose} />

  // Chargement : overlay plein écran fermable.
  if (state === 'loading') {
    if (!mounted) return null
    return createPortal(
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 15000, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: 13.5, color: 'var(--text-dim)', margin: 0, fontFamily: 'var(--font-body)' }}>Chargement de l’analyse…</p>
      </div>,
      document.body,
    )
  }

  return (
    <ActivityDetail
      a={row as SharedActivityRow}
      onClose={onClose}
      zones={(row?.zones as SharedActivityRow) ?? []}
      profile={EMPTY_PROFILE}
      allActivities={[]}
      readOnly
    />
  )
}
