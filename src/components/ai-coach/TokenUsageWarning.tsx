'use client'

// ══════════════════════════════════════════════════════════════
// TokenUsageWarning — bandeau d'alerte de consommation, affiché
// juste au-dessus du champ de saisie du chat. Paliers 50/70/90/100 %
// de l'enveloppe mensuelle. Fermable (✕) : la fermeture d'un palier
// ne masque QUE ce palier — le suivant réapparaît. À 100 %, propose
// le rechargement de tokens (par email, règle App Store).
//
// Se rafraîchit à l'ouverture du panneau (thw:ai-open) et après chaque
// message (thw:tokens-updated). Léger : un seul GET, état local isolé.
// ══════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback } from 'react'

interface MonthlyLimit { used: number; limit: number; resets_at: string }
interface TokenLimits { monthly: MonthlyLimit }

const THRESHOLDS = [100, 90, 70, 50] as const // décroissant : on prend le plus haut atteint

function crossedThreshold(pct: number): number | null {
  for (const t of THRESHOLDS) if (pct >= t) return t
  return null
}

// Clé de mémorisation : palier + cycle (resets_at) → réinitialisée chaque mois.
function dismissKey(resetsAt: string): string { return `thw-ai-usage-dismiss:${resetsAt}` }

function readDismissed(resetsAt: string): number {
  try {
    const v = localStorage.getItem(dismissKey(resetsAt))
    return v ? parseInt(v, 10) || 0 : 0
  } catch { return 0 }
}
function writeDismissed(resetsAt: string, threshold: number): void {
  try { localStorage.setItem(dismissKey(resetsAt), String(threshold)) } catch { /* ignore */ }
}

export default function TokenUsageWarning({ onBuyTokens, isMobile = false }: { onBuyTokens: () => void; isMobile?: boolean }) {
  const [monthly, setMonthly] = useState<MonthlyLimit | null>(null)
  const [dismissedTick, setDismissedTick] = useState(0) // force un recompute après fermeture

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/tokens/limits')
      if (res.ok) { const d = await res.json() as TokenLimits; setMonthly(d.monthly ?? null) }
    } catch { /* silencieux */ }
  }, [])

  useEffect(() => { void load() }, [load])
  useEffect(() => {
    const onRefresh = () => { void load() }
    const onOpen = (e: Event) => { if ((e as CustomEvent).detail) void load() }
    window.addEventListener('thw:tokens-updated', onRefresh)
    window.addEventListener('thw:ai-open', onOpen)
    return () => {
      window.removeEventListener('thw:tokens-updated', onRefresh)
      window.removeEventListener('thw:ai-open', onOpen)
    }
  }, [load])

  if (!monthly || !monthly.limit || !isFinite(monthly.limit)) return null

  const pct = Math.min(100, Math.max(0, (monthly.used / monthly.limit) * 100))
  const crossed = crossedThreshold(pct)
  if (crossed === null) return null

  // On n'affiche que si le palier atteint est STRICTEMENT supérieur au dernier
  // fermé pour ce cycle (fermer 50 % laisse réapparaître 70 %, etc.).
  const dismissed = readDismissed(monthly.resets_at)
  void dismissedTick // dépendance implicite pour le recompute
  if (crossed <= dismissed) return null

  const atLimit = crossed >= 100
  const near = crossed >= 90

  const bg = atLimit ? 'rgba(239,68,68,0.10)' : near ? 'rgba(245,158,11,0.12)' : 'rgba(6,182,212,0.08)'
  const border = atLimit ? 'rgba(239,68,68,0.35)' : near ? 'rgba(245,158,11,0.35)' : 'rgba(6,182,212,0.28)'
  const accent = atLimit ? '#EF4444' : near ? '#F59E0B' : '#06B6D4'

  const title = atLimit
    ? 'Enveloppe mensuelle épuisée'
    : `Tu as utilisé ${Math.round(pct)} % de ton enveloppe mensuelle`
  const sub = atLimit
    ? 'Recharge des tokens pour continuer à discuter avec ton coach IA ce mois-ci.'
    : crossed >= 90
      ? 'Il te reste peu de tokens avant la fin du mois.'
      : 'Pense à surveiller ta consommation pour tenir jusqu\'à la remise à zéro.'

  const close = () => { writeDismissed(monthly.resets_at, crossed); setDismissedTick(x => x + 1) }

  return (
    <div style={{
      margin: isMobile ? '0 2px 8px' : '0 4px 8px',
      padding: '10px 12px',
      borderRadius: 12,
      background: bg,
      border: `1px solid ${border}`,
      display: 'flex', alignItems: 'flex-start', gap: 10,
    }}>
      {/* Icône */}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
        <path d="M12 9v4M12 17h.01" />
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      </svg>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ai-text, var(--text))', lineHeight: 1.35 }}>{title}</div>
        <div style={{ fontSize: 11.5, color: 'var(--ai-mid, var(--text-mid))', lineHeight: 1.45, marginTop: 2 }}>{sub}</div>
        {atLimit && (
          <button
            onClick={onBuyTokens}
            style={{
              marginTop: 8, height: 32, padding: '0 14px', borderRadius: 8, border: 'none',
              background: accent, color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif',
            }}
          >Recharger des tokens →</button>
        )}
      </div>

      {/* Fermer ce palier */}
      <button
        onClick={close}
        aria-label="Masquer"
        style={{
          width: 20, height: 20, borderRadius: '50%', border: 'none', flexShrink: 0,
          background: 'transparent', color: 'var(--ai-dim, var(--text-dim))', cursor: 'pointer',
          fontSize: 15, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >×</button>
    </div>
  )
}
