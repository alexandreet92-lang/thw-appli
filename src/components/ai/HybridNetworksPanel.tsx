'use client'

/**
 * HybridNetworksPanel
 * Contenu de l'agent "Hybrid Networks" dans le panneau Coach IA.
 * Admin-only (NEXT_PUBLIC_ADMIN_EMAIL). Non-admin → placeholder.
 */

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { InstaSnapshot, DailyBrief, BriefIdea } from '@/lib/marketing/types'
import type { PerformanceAnalysis } from '@/app/api/marketing/analyze-performance/route'

// ── Helpers ────────────────────────────────────────────────────

function isAdminEmail(email: string | undefined | null): boolean {
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
  if (!adminEmail || !email) return false
  return email.toLowerCase() === adminEmail.toLowerCase()
}

const PILLAR_COLORS: Record<string, string> = {
  athlete: '#00c8e0',
  expert:  '#5b6fff',
  builder: '#f59e0b',
}
const TIER: Record<string, { label: string; color: string }> = {
  express:  { label: 'EXPRESS · 5 min',   color: '#10b981' },
  standard: { label: 'STANDARD · 20 min', color: '#5b6fff' },
  deep:     { label: 'DEEP · 1h+',        color: '#ef4444' },
}

const SCORE_COLORS: Record<string, string> = {
  A: '#22c55e', B: '#3b82f6', C: '#f59e0b', D: '#ef4444', F: '#991b1b',
}
const EFFORT_COLORS: Record<string, string> = {
  low: '#22c55e', medium: '#f59e0b', high: '#ef4444',
}
const FORMAT_COLORS: Record<string, string> = {
  reel: '#ef4444', carousel: '#5b6fff', photo: '#f59e0b',
}

// ── Inline icons (raw SVG) ─────────────────────────────────────

function IconRefresh({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/>
      <polyline points="1 20 1 14 7 14"/>
      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
    </svg>
  )
}

function IconSparkles({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.937 15.5A2 2 0 008.5 14.063l-6.135-1.582a.5.5 0 010-.962L8.5 9.936A2 2 0 009.937 8.5l1.582-6.135a.5.5 0 01.963 0L14.063 8.5A2 2 0 0015.5 9.937l6.135 1.581a.5.5 0 010 .964L15.5 14.063a2 2 0 00-1.437 1.437l-1.582 6.135a.5.5 0 01-.963 0z"/>
    </svg>
  )
}

function IconBarChart({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
      <line x1="2" y1="20" x2="22" y2="20"/>
    </svg>
  )
}

function IconGlobe({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/>
    </svg>
  )
}

function Spinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      style={{ animation: 'hn_spin 0.8s linear infinite', flexShrink: 0 }}>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
  )
}

// ── Sub-components ─────────────────────────────────────────────

function IdeaCard({ idea }: { idea: BriefIdea }) {
  const [copied, setCopied] = useState(false)
  const tier    = TIER[idea.tier]    ?? TIER.standard
  const pillarC = PILLAR_COLORS[idea.pillar] ?? '#666'

  function copyCaption() {
    const text = `${idea.caption}\n\n${idea.hashtags?.map(h => `#${h.replace(/^#/, '')}`).join(' ') ?? ''}`
    void navigator.clipboard?.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div style={{ background: 'var(--ai-bg2)', border: '1px solid var(--ai-border)', borderRadius: 12, padding: 14, position: 'relative' }}>
      {/* Badges */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: tier.color, color: '#fff', letterSpacing: 0.4 }}>
          {tier.label}
        </span>
        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: pillarC, color: '#fff', textTransform: 'uppercase', letterSpacing: 0.6 }}>
          {idea.pillar}
        </span>
        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'rgba(255,255,255,0.08)', color: 'var(--ai-text)', textTransform: 'uppercase', letterSpacing: 0.6 }}>
          {idea.format}
        </span>
        <span style={{ fontSize: 10, color: 'var(--ai-dim)', marginLeft: 'auto', alignSelf: 'center' }}>
          ~{idea.production_minutes} min
        </span>
      </div>
      {/* Hook */}
      <p style={{ fontFamily: 'Syne,sans-serif', fontSize: 14, fontWeight: 700, margin: '0 0 8px', lineHeight: 1.35, color: 'var(--ai-text)' }}>
        {idea.hook}
      </p>
      {/* Structure */}
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ai-dim)', margin: '0 0 3px' }}>Structure</p>
      <p style={{ fontSize: 12, whiteSpace: 'pre-wrap', color: 'var(--ai-mid)', margin: '0 0 10px' }}>{idea.structure}</p>
      {/* Caption */}
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ai-dim)', margin: '0 0 3px' }}>Caption</p>
      <p style={{ fontSize: 12, whiteSpace: 'pre-wrap', background: 'rgba(0,0,0,0.2)', padding: '8px 10px', borderRadius: 8, margin: '0 0 8px', color: 'var(--ai-mid)' }}>
        {idea.caption}
      </p>
      {/* Hashtags */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
        {idea.hashtags?.map(h => (
          <span key={h} style={{ fontSize: 11, color: '#5b6fff', background: 'rgba(91,111,255,0.12)', padding: '1px 7px', borderRadius: 5 }}>
            #{h.replace(/^#/, '')}
          </span>
        ))}
      </div>
      {/* Why */}
      <p style={{ fontSize: 11, color: 'var(--ai-dim)', fontStyle: 'italic', borderTop: '1px solid var(--ai-border)', paddingTop: 7, margin: 0 }}>
        {idea.why_it_works}
      </p>
      {/* Copy */}
      <button
        onClick={copyCaption}
        style={{ position: 'absolute', top: 10, right: 10, background: 'transparent', border: '1px solid var(--ai-border)', borderRadius: 6, padding: '2px 8px', fontSize: 10, cursor: 'pointer', color: copied ? '#22c55e' : 'var(--ai-dim)' }}
      >
        {copied ? 'Copié' : 'Copier'}
      </button>
    </div>
  )
}

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ background: 'var(--ai-bg2)', border: '1px solid var(--ai-border)', borderRadius: 10, padding: '12px 14px' }}>
      <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ai-dim)', margin: '0 0 4px' }}>{label}</p>
      <p style={{ fontFamily: 'Syne,sans-serif', fontSize: 22, fontWeight: 700, color: 'var(--ai-text)', margin: 0, lineHeight: 1.1 }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: 'var(--ai-dim)', margin: '3px 0 0' }}>{sub}</p>}
    </div>
  )
}

function QuickActionCard({
  icon, label, sub, loading, onClick, disabled,
}: {
  icon: React.ReactNode
  label: string
  sub: string
  loading?: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10, padding: '11px 14px',
        borderRadius: 10, border: '1px solid var(--ai-border)', background: 'var(--ai-bg2)',
        cursor: (disabled || loading) ? 'wait' : 'pointer', textAlign: 'left', width: '100%',
        opacity: (disabled || loading) ? 0.65 : 1, transition: 'border-color 0.12s',
      }}
    >
      <div style={{ color: 'var(--ai-dim)', flexShrink: 0, marginTop: 1 }}>
        {loading ? <Spinner /> : icon}
      </div>
      <div>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ai-text)', margin: '0 0 2px', lineHeight: 1.3 }}>{label}</p>
        <p style={{ fontSize: 11, color: 'var(--ai-dim)', margin: 0, lineHeight: 1.3 }}>{sub}</p>
      </div>
    </button>
  )
}

// ── Main component ─────────────────────────────────────────────

export default function HybridNetworksPanel() {
  const [isAdmin,  setIsAdmin]  = useState(false)
  const [checking, setChecking] = useState(true)

  // Instagram data
  const [snapshot,  setSnapshot]  = useState<InstaSnapshot | null>(null)
  const [syncing,   setSyncing]   = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)

  // Brief
  const [brief,        setBrief]        = useState<DailyBrief | null>(null)
  const [briefLoading, setBriefLoading] = useState(false)
  const [briefError,   setBriefError]   = useState<string | null>(null)

  // Analysis
  const [analysis,        setAnalysis]        = useState<PerformanceAnalysis | null>(null)
  const [analyzeLoading,  setAnalyzeLoading]  = useState(false)
  const [analyzeError,    setAnalyzeError]    = useState<string | null>(null)

  // ── Admin check + load snapshot ──────────────────────────────
  useEffect(() => {
    void (async () => {
      try {
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        const admin = isAdminEmail(user?.email)
        setIsAdmin(admin)
        if (admin) {
          // Load latest API snapshot
          const res = await fetch('/api/marketing/insta-sync')
          if (res.ok) {
            const json = await res.json() as { snapshot: InstaSnapshot | null }
            setSnapshot(json.snapshot ?? null)
          }
        }
      } catch (e) {
        console.error('[HybridNetworks] init error:', e)
      } finally {
        setChecking(false)
      }
    })()
  }, [])

  // ── Sync Instagram ───────────────────────────────────────────
  const handleSync = useCallback(async () => {
    setSyncing(true)
    setSyncError(null)
    try {
      const res = await fetch('/api/marketing/insta-sync', { method: 'POST' })
      const json = await res.json() as { snapshot?: InstaSnapshot; error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Erreur sync')
      setSnapshot(json.snapshot ?? null)
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setSyncing(false)
    }
  }, [])

  // ── Générer brief ────────────────────────────────────────────
  const handleBrief = useCallback(async () => {
    setBriefLoading(true)
    setBriefError(null)
    setBrief(null)
    setAnalysis(null)
    try {
      const res = await fetch('/api/marketing/daily-brief', { method: 'POST' })
      const json = await res.json() as { brief?: DailyBrief; error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Erreur génération')
      setBrief(json.brief ?? null)
    } catch (err) {
      setBriefError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setBriefLoading(false)
    }
  }, [])

  // ── Analyser performances ────────────────────────────────────
  const handleAnalyze = useCallback(async () => {
    if (!snapshot) {
      setAnalyzeError('Synchronise d\'abord ton Instagram pour récupérer les données.')
      return
    }
    setAnalyzeLoading(true)
    setAnalyzeError(null)
    setAnalysis(null)
    setBrief(null)
    try {
      const res = await fetch('/api/marketing/analyze-performance', { method: 'POST' })
      const json = await res.json() as { analysis?: PerformanceAnalysis; error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Erreur analyse')
      setAnalysis(json.analysis ?? null)
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setAnalyzeLoading(false)
    }
  }, [snapshot])

  // ── Loading / non-admin ──────────────────────────────────────
  if (checking) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 28px', gap: 18, animation: 'ai_slidein 0.2s ease' }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(91,111,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5b6fff' }}>
          <IconGlobe size={28} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 18, color: 'var(--ai-text)', margin: '0 0 8px' }}>Hybrid Networks</p>
          <p style={{ fontSize: 13, color: 'var(--ai-mid)', margin: '0 0 6px', lineHeight: 1.7 }}>Analyse Instagram · Brief marketing · Stratégie de contenu</p>
          <p style={{ fontSize: 12, color: 'var(--ai-dim)', margin: 0 }}>Cet agent arrive bientôt.</p>
        </div>
      </div>
    )
  }

  // ── Admin view ───────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes hn_spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        .hn-qa:hover { border-color: rgba(91,111,255,0.4) !important; background: rgba(91,111,255,0.06) !important; }
        .hn-qa:hover .hn-qa-icon { color: #5b6fff !important; }
      `}</style>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', padding: '20px 16px', gap: 0 }}>

        {/* ── HEADER ─────────────────────────────────────────── */}
        <div style={{ marginBottom: 20, animation: 'ai_slidein 0.2s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(91,111,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5b6fff', flexShrink: 0 }}>
              <IconGlobe size={16} />
            </div>
            <p style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 16, color: 'var(--ai-text)', margin: 0 }}>
              Hybrid Networks
            </p>
          </div>
          <p style={{ fontSize: 12, color: 'var(--ai-dim)', margin: '0 0 0 42px' }}>
            {snapshot
              ? `Dernier sync : ${snapshot.snapshot_date}${snapshot.followers_count != null ? ` · ${snapshot.followers_count.toLocaleString('fr-FR')} abonnés` : ''}`
              : 'Ton agent marketing connecté à Instagram'
            }
          </p>
        </div>

        {/* ── ACTIONS RAPIDES ────────────────────────────────── */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--ai-dim)', margin: '0 0 8px' }}>
            Actions rapides
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="hn-qa">
              <QuickActionCard
                icon={<span className="hn-qa-icon"><IconRefresh size={15} /></span>}
                label="Synchroniser Instagram"
                sub="Récupérer les dernières stats de ton compte"
                loading={syncing}
                onClick={handleSync}
              />
            </div>
            <div className="hn-qa">
              <QuickActionCard
                icon={<span className="hn-qa-icon"><IconSparkles size={15} /></span>}
                label="Générer le brief du jour"
                sub="3 idées de posts basées sur tes données"
                loading={briefLoading}
                onClick={handleBrief}
              />
            </div>
            <div className="hn-qa">
              <QuickActionCard
                icon={<span className="hn-qa-icon"><IconBarChart size={15} /></span>}
                label="Analyser mes performances"
                sub="Analyse détaillée de ce qui marche et ce qui marche pas"
                loading={analyzeLoading}
                onClick={handleAnalyze}
              />
            </div>
          </div>
        </div>

        {/* ── ERRORS ─────────────────────────────────────────── */}
        {(syncError || briefError || analyzeError) && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '8px 12px', marginBottom: 16, fontSize: 12, color: '#ef4444' }}>
            {syncError ?? briefError ?? analyzeError}
          </div>
        )}

        {/* ── KPI CARDS ──────────────────────────────────────── */}
        {snapshot && (
          <div style={{ marginBottom: 20, animation: 'ai_slidein 0.2s ease' }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--ai-dim)', margin: '0 0 8px' }}>
              Stats Instagram
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {snapshot.followers_count != null && (
                <KpiCard
                  label="Abonnés"
                  value={snapshot.followers_count.toLocaleString('fr-FR')}
                  sub={snapshot.followers_delta_7d != null
                    ? `${snapshot.followers_delta_7d > 0 ? '+' : ''}${snapshot.followers_delta_7d} cette semaine`
                    : undefined}
                />
              )}
              {snapshot.reach_total != null && (
                <KpiCard label="Reach 28j" value={snapshot.reach_total.toLocaleString('fr-FR')} />
              )}
              {snapshot.impressions_total != null && (
                <KpiCard label="Impressions 28j" value={snapshot.impressions_total.toLocaleString('fr-FR')} />
              )}
              {snapshot.best_format && (
                <KpiCard
                  label="Meilleur format"
                  value={snapshot.best_format.charAt(0).toUpperCase() + snapshot.best_format.slice(1)}
                />
              )}
            </div>
          </div>
        )}

        {/* ── TOP 3 POSTS ────────────────────────────────────── */}
        {snapshot && (snapshot.top_posts ?? []).length > 0 && (
          <div style={{ marginBottom: 20, animation: 'ai_slidein 0.2s ease' }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--ai-dim)', margin: '0 0 8px' }}>
              Top 3 posts
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {(snapshot.top_posts ?? []).slice(0, 3).map((post, i) => (
                <div key={i} style={{ background: 'var(--ai-bg2)', border: '1px solid var(--ai-border)', borderRadius: 10, padding: '9px 12px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99,
                    background: FORMAT_COLORS[post.format] ?? '#666', color: '#fff',
                    textTransform: 'uppercase', letterSpacing: 0.5, flexShrink: 0, marginTop: 1,
                  }}>
                    {post.format}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, color: 'var(--ai-text)', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontStyle: 'italic' }}>
                      {post.caption_excerpt || '(sans légende)'}
                    </p>
                    <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--ai-dim)' }}>
                      <span>♥ {post.likes.toLocaleString('fr-FR')}</span>
                      <span>⬇ {post.saves.toLocaleString('fr-FR')}</span>
                      <span>◎ {post.reach.toLocaleString('fr-FR')}</span>
                      {post.comments != null && <span>✦ {post.comments}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── BRIEF RÉSULTAT ─────────────────────────────────── */}
        {brief && (
          <div style={{ marginBottom: 20, animation: 'ai_slidein 0.25s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#f59e0b', margin: 0 }}>
                Brief du {brief.date}
              </p>
              {brief.weekly_analysis && (
                <span style={{ fontSize: 10, color: 'var(--ai-dim)', marginLeft: 'auto' }}>
                  Urgence : <strong>{brief.weekly_analysis.urgency}</strong>
                </span>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {brief.ideas?.map((idea, i) => (
                <IdeaCard key={i} idea={idea} />
              ))}
            </div>
          </div>
        )}

        {/* ── ANALYSE PERFORMANCES ───────────────────────────── */}
        {analysis && (
          <div style={{ animation: 'ai_slidein 0.25s ease' }}>

            {/* A — Score global */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, background: 'var(--ai-bg2)', border: '1px solid var(--ai-border)', borderRadius: 12, padding: '14px 16px' }}>
              <div style={{
                width: 52, height: 52, borderRadius: 12, flexShrink: 0,
                background: SCORE_COLORS[analysis.overall_score] + '18',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontFamily: 'Syne,sans-serif', fontSize: 28, fontWeight: 700, color: SCORE_COLORS[analysis.overall_score] }}>
                  {analysis.overall_score}
                </span>
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ai-text)', margin: '0 0 2px' }}>Score global</p>
                <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--ai-dim)', flexWrap: 'wrap' }}>
                  <span>Engagement : <strong style={{ color: 'var(--ai-mid)' }}>{analysis.engagement_rate}</strong></span>
                  <span>Tendance : <strong style={{ color: analysis.follower_trend === 'growing' ? '#22c55e' : analysis.follower_trend === 'declining' ? '#ef4444' : 'var(--ai-mid)' }}>{analysis.follower_trend === 'growing' ? 'Croissance' : analysis.follower_trend === 'declining' ? 'Déclin' : 'Stable'}</strong></span>
                </div>
              </div>
            </div>

            {/* F — Résumé */}
            <div style={{ background: 'rgba(91,111,255,0.06)', border: '1px solid rgba(91,111,255,0.15)', borderRadius: 10, padding: '10px 14px', marginBottom: 14 }}>
              <p style={{ fontSize: 12, color: 'var(--ai-mid)', margin: 0, lineHeight: 1.6, fontStyle: 'italic' }}>
                &ldquo;{analysis.summary}&rdquo;
              </p>
            </div>

            {/* B — Ce qui marche */}
            {analysis.what_works.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#22c55e', margin: '0 0 7px' }}>Ce qui marche</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {analysis.what_works.map((item, i) => (
                    <div key={i} style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, padding: '9px 12px' }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ai-text)', margin: '0 0 3px' }}>{item.insight}</p>
                      <p style={{ fontSize: 11, color: 'var(--ai-dim)', margin: '0 0 3px' }}>{item.evidence}</p>
                      <p style={{ fontSize: 11, color: '#22c55e', margin: 0 }}>→ {item.action}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* C — Ce qui ne marche pas */}
            {analysis.what_doesnt_work.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#ef4444', margin: '0 0 7px' }}>Ce qui ne marche pas</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {analysis.what_doesnt_work.map((item, i) => (
                    <div key={i} style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '9px 12px' }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ai-text)', margin: '0 0 3px' }}>{item.insight}</p>
                      <p style={{ fontSize: 11, color: 'var(--ai-dim)', margin: '0 0 3px' }}>{item.evidence}</p>
                      <p style={{ fontSize: 11, color: '#f59e0b', margin: 0 }}>→ {item.action}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* D — Recommandations */}
            {analysis.recommendations.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--ai-dim)', margin: '0 0 7px' }}>Recommandations</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {analysis.recommendations.map((rec, i) => (
                    <div key={i} style={{ background: 'var(--ai-bg2)', border: '1px solid var(--ai-border)', borderRadius: 8, padding: '9px 12px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <span style={{ fontFamily: 'Syne,sans-serif', fontSize: 14, fontWeight: 700, color: '#5b6fff', flexShrink: 0, width: 16, textAlign: 'center' }}>{rec.priority}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ai-text)', margin: '0 0 2px' }}>{rec.action}</p>
                        <p style={{ fontSize: 11, color: 'var(--ai-dim)', margin: '0 0 5px' }}>{rec.expected_impact}</p>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 99, background: EFFORT_COLORS[rec.effort] + '20', color: EFFORT_COLORS[rec.effort], textTransform: 'uppercase', letterSpacing: 0.4 }}>
                          {rec.effort}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* E — Projection */}
            {analysis.growth_projection && (
              <div style={{ background: 'var(--ai-bg2)', border: '1px solid var(--ai-border)', borderRadius: 10, padding: '10px 14px', marginBottom: 8 }}>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--ai-dim)', margin: '0 0 6px' }}>Projection fin 2026</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                  <span style={{ fontSize: 18, fontWeight: 700, fontFamily: 'Syne,sans-serif', color: 'var(--ai-text)' }}>
                    {analysis.growth_projection.current_followers.toLocaleString('fr-FR')}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--ai-dim)' }}>→</span>
                  <span style={{ fontSize: 18, fontWeight: 700, fontFamily: 'Syne,sans-serif', color: analysis.growth_projection.on_track ? '#22c55e' : '#f59e0b' }}>
                    {analysis.growth_projection.projected_dec_2026.toLocaleString('fr-FR')}
                  </span>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: analysis.growth_projection.on_track ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)', color: analysis.growth_projection.on_track ? '#22c55e' : '#f59e0b', fontWeight: 600 }}>
                    {analysis.growth_projection.on_track ? 'On track' : 'À accélérer'}
                  </span>
                </div>
                <p style={{ fontSize: 11, color: 'var(--ai-dim)', margin: 0 }}>
                  {analysis.growth_projection.acceleration_needed}
                </p>
              </div>
            )}

          </div>
        )}

        {/* Padding bottom */}
        <div style={{ height: 20, flexShrink: 0 }} />
      </div>
    </>
  )
}
