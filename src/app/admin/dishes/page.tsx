'use client'
// ══════════════════════════════════════════════════════════════════
// /admin/dishes — import one-shot du catalogue de plats (Spoonacular).
// Réservé au créateur. Le bouton appelle POST /api/admin/seed-dishes,
// qui tourne côté serveur Vercel (accès réseau Spoonacular).
// ══════════════════════════════════════════════════════════════════
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const CYAN = '#06B6D4'

function isAdminEmail(email: string | undefined | null): boolean {
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
  if (!adminEmail || !email) return false
  return email.toLowerCase() === adminEmail.toLowerCase()
}

interface SeedResult {
  ok?:        boolean
  inserted?:  number
  photos?:    number
  total?:     number
  breakdown?: Array<{ type: string; count: number }>
  warning?:   string
  error?:     string
}

export default function SeedDishesPage() {
  const router = useRouter()
  const [authChecked, setAuthChecked] = useState(false)
  const [count, setCount]   = useState<number | null>(null)
  const [running, setRunning] = useState(false)
  const [result, setResult]   = useState<SeedResult | null>(null)

  const loadCount = useCallback(async () => {
    const sb = createClient()
    const { count } = await sb.from('dishes').select('*', { count: 'exact', head: true })
    setCount(count ?? 0)
  }, [])

  useEffect(() => {
    const sb = createClient()
    void (async () => {
      const { data: { user } } = await sb.auth.getUser()
      if (!isAdminEmail(user?.email)) { void router.replace('/'); return }
      setAuthChecked(true)
      void loadCount()
    })()
  }, [router, loadCount])

  async function runSeed() {
    setRunning(true); setResult(null)
    try {
      const res  = await fetch('/api/admin/seed-dishes', { method: 'POST' })
      const data = await res.json() as SeedResult
      setResult(data)
      if (data.ok) await loadCount()
    } catch (e) {
      setResult({ error: e instanceof Error ? e.message : 'Erreur réseau' })
    } finally {
      setRunning(false)
    }
  }

  if (!authChecked) {
    return (
      <div style={{ maxWidth: 560, margin: '0 auto', padding: 24 }}>
        <div style={{ height: 28, width: '50%', borderRadius: 8, background: 'var(--border)', animation: 'pulse 1.4s ease-in-out infinite' }} />
        <div style={{ height: 120, marginTop: 16, borderRadius: 12, background: 'var(--bg-card2)', animation: 'pulse 1.4s ease-in-out infinite' }} />
      </div>
    )
  }

  const label = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'var(--text-dim)' }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 16px 64px' }}>
      <h1 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 24, color: 'var(--text)', margin: '0 0 4px' }}>
        Catalogue de plats
      </h1>
      <p style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 13, color: 'var(--text-mid)', margin: '0 0 24px', lineHeight: 1.5 }}>
        Reconstruit le catalogue de plats sportifs (français, macros maîtrisées)
        et va chercher une photo par plat. Rejouable à volonté.
      </p>

      {/* État actuel */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={label}>Plats en base</div>
        <div style={{ fontFamily: 'DM Mono,monospace', fontWeight: 700, fontSize: 32, color: count ? CYAN : 'var(--text-dim)', marginTop: 4 }}>
          {count ?? '—'}
        </div>
      </div>

      {/* Contrôle */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
        <button onClick={() => void runSeed()} disabled={running}
          style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', minHeight: 44,
            background: running ? 'var(--border)' : `linear-gradient(135deg,${CYAN},#3B82F6)`,
            color: '#fff', fontWeight: 700, fontSize: 14, fontFamily: 'Syne,sans-serif',
            cursor: running ? 'default' : 'pointer' }}>
          {running ? 'Reconstruction en cours…' : 'Reconstruire le catalogue + photos'}
        </button>

        <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: '10px 0 0', lineHeight: 1.5 }}>
          Nécessite <code style={{ fontFamily: 'DM Mono,monospace' }}>SPOONACULAR_API_KEY</code> dans les variables
          d&apos;environnement Vercel (pour les photos). L&apos;opération prend ~10&nbsp;s.
        </p>
      </div>

      {/* Résultat */}
      {result && (
        <div style={{ marginTop: 16, background: 'var(--bg-card)', border: `1px solid ${result.ok ? `${CYAN}55` : 'rgba(239,68,68,0.4)'}`, borderRadius: 12, padding: 16 }}>
          {result.ok ? (
            <>
              <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 14, color: CYAN, marginBottom: 4 }}>
                ✓ {result.inserted} plats · {result.photos ?? 0} avec photo
              </div>
              {result.warning && (
                <div style={{ fontSize: 11, color: '#f59e0b', marginBottom: 10 }}>{result.warning}</div>
              )}
              {result.breakdown && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {result.breakdown.map(b => (
                    <div key={b.type} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ color: 'var(--text-mid)', fontFamily: 'DM Sans,sans-serif' }}>{b.type}</span>
                      <span style={{ color: 'var(--text)', fontFamily: 'DM Mono,monospace' }}>{b.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 13, color: '#ef4444', lineHeight: 1.5 }}>
              ✗ {result.error}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
