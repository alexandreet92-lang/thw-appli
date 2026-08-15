'use client'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

// ══════════════════════════════════════════════════════════════
// TRAINING COACH — flux des entraînements RÉALISÉS par les athlètes, pour les
// analyser. Chaque séance : athlète, sport, date, durée/distance/charge, avec
// une action « Analyser par l'IA » (ouvre l'IA coach avec un prompt ciblé) et
// un accès au planning de l'athlète. Filtres athlète + sport. Design : tokens,
// Fraunces (titres) / Inter tabulaire (chiffres), points sport en accent.
// ══════════════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { listMyAthletes, type AthleteSummary } from '@/lib/coach/relationships'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/shared/Sidebar'
import { FilterMenu, type Opt } from '@/components/coach/CoachMenus'

const DISP = 'var(--font-display)'
const BODY = 'var(--font-body)'

const SPORT_COLOR: Record<string, string> = {
  run: '#22c55e', running: '#22c55e', bike: '#3b82f6', cycling: '#3b82f6', swim: '#06b6d4',
  hyrox: '#ef4444', gym: '#f97316', trail: '#f97316', trail_run: '#f97316', rowing: '#14b8a6',
}
const SPORT_LABEL: Record<string, string> = {
  run: 'Course', running: 'Course', bike: 'Vélo', cycling: 'Vélo', swim: 'Natation',
  hyrox: 'Hyrox', gym: 'Muscu', trail: 'Trail', trail_run: 'Trail', rowing: 'Aviron',
}
const sportColor = (s: string) => SPORT_COLOR[s] ?? 'var(--text-mid)'
const sportLabel = (s: string) => SPORT_LABEL[s] ?? (s ? s.charAt(0).toUpperCase() + s.slice(1) : '')

const fmtDur = (s: number) => { const m = Math.round(s / 60); return m >= 60 ? `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}` : `${m} min` }
const fmtDist = (m: number) => m >= 1000 ? `${(m / 1000).toFixed(m >= 10000 ? 0 : 1)} km` : `${m} m`
function relDate(iso: string): string {
  const d = new Date(iso); const now = new Date()
  const days = Math.floor((new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / 86400000)
  if (days <= 0) return "Aujourd'hui"
  if (days === 1) return 'Hier'
  if (days < 7) return `Il y a ${days} j`
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

interface Act { id: string; user_id: string; sport: string; title: string; started_at: string; dur_s: number; dist_m: number; tss: number | null }

export default function CoachTraining() {
  const router = useRouter()
  const [athletes, setAthletes] = useState<AthleteSummary[]>([])
  const [acts, setActs] = useState<Act[]>([])
  const [loading, setLoading] = useState(true)
  const [fAth, setFAth] = useState('__all__')
  const [fSport, setFSport] = useState('__all__')

  useEffect(() => {
    let alive = true
    void (async () => {
      const list = await listMyAthletes().catch(() => [] as AthleteSummary[])
      const ids = list.map(a => a.id)
      const sb = createClient()
      const since = new Date(); since.setDate(since.getDate() - 21)
      let rows: Record<string, unknown>[] = []
      if (ids.length) {
        try {
          const { data } = await sb.from('activities')
            .select('id,user_id,sport_type,title,started_at,moving_time_s,elapsed_time_s,distance_m,tss')
            .in('user_id', ids).gte('started_at', since.toISOString()).order('started_at', { ascending: false }).limit(120)
          rows = (data ?? []) as Record<string, unknown>[]
        } catch { rows = [] }
      }
      if (!alive) return
      setAthletes(list)
      setActs((rows as Record<string, unknown>[]).map(a => ({
        id: a.id as string, user_id: a.user_id as string, sport: (a.sport_type as string) ?? 'run',
        title: (a.title as string) || 'Séance', started_at: a.started_at as string,
        dur_s: (a.moving_time_s as number) ?? (a.elapsed_time_s as number) ?? 0,
        dist_m: (a.distance_m as number) ?? 0, tss: (a.tss as number | null) ?? null,
      })))
      setLoading(false)
    })()
    return () => { alive = false }
  }, [])

  const nameOf = useMemo(() => { const m = new Map<string, AthleteSummary>(); athletes.forEach(a => m.set(a.id, a)); return m }, [athletes])

  const athOpts = useMemo(() => athletes.map(a => ({ value: a.id, label: a.full_name || a.first_name || 'Athlète' } as Opt)), [athletes])
  const sportOpts = useMemo(() => Array.from(new Set(acts.map(a => a.sport))).map(s => ({ value: s, label: sportLabel(s) } as Opt)), [acts])

  const shown = useMemo(() => acts.filter(a => (fAth === '__all__' || a.user_id === fAth) && (fSport === '__all__' || a.sport === fSport)), [acts, fAth, fSport])

  const analyze = (a: Act) => {
    const who = nameOf.get(a.user_id)
    const name = who?.full_name || who?.first_name || 'cet athlète'
    window.dispatchEvent(new CustomEvent('thw:open-coach', { detail: { prompt: `Analyse la séance « ${a.title} » de ${name} (${sportLabel(a.sport)}, ${relDate(a.started_at).toLowerCase()}) : qualité d'exécution, charge, et points d'amélioration.` } }))
  }

  return (
    <div style={{ width: '100%', padding: '20px clamp(16px,4vw,40px) 60px', boxSizing: 'border-box', fontFamily: BODY }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
        <h1 style={{ fontFamily: DISP, fontWeight: 600, fontSize: 28, margin: 0, color: 'var(--text)' }}>Training</h1>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--primary)', background: 'color-mix(in srgb, var(--primary) 12%, transparent)', borderRadius: 7, padding: '3px 9px' }}>Coach</span>
        <span style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>Analyse les entraînements réalisés par tes athlètes.</span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', margin: '16px 0' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Filtrer</span>
        <FilterMenu label="Athlète" value={fAth} options={athOpts} onChange={setFAth} />
        <FilterMenu label="Sport" value={fSport} options={sportOpts} onChange={setFSport} />
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-dim)', fontVariantNumeric: 'tabular-nums' }}>{shown.length} séance{shown.length > 1 ? 's' : ''} · 21 j</span>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{Array.from({ length: 4 }).map((_, i) => <div key={i} style={{ height: 74, borderRadius: 16, border: '1px solid var(--border)', background: 'var(--bg-card)', opacity: 0.6 }} />)}</div>
      ) : shown.length === 0 ? (
        <div style={{ borderRadius: 18, border: '1px solid var(--border)', background: 'var(--bg-card)', padding: 26, textAlign: 'center', color: 'var(--text-dim)', fontSize: 14 }}>
          {athletes.length === 0 ? 'Aucun athlète. Invite-en un depuis « Athlètes ».' : 'Aucune séance sur les 21 derniers jours.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {shown.map(a => {
            const who = nameOf.get(a.user_id)
            const name = who?.full_name || who?.first_name || 'Athlète'
            const metrics = [fmtDur(a.dur_s), a.dist_m > 0 ? fmtDist(a.dist_m) : '', a.tss ? `${Math.round(a.tss)} TSS` : ''].filter(Boolean)
            return (
              <Link key={a.id} href={`/coach/planning/${a.user_id}`}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'color-mix(in srgb, var(--primary) 40%, var(--border))'; el.style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--border)'; el.style.transform = 'none' }}
                style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', padding: '13px 14px 13px 20px', borderRadius: 16, border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer', transition: 'transform .16s, border-color .16s', textDecoration: 'none', color: 'inherit' }}>
                <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: sportColor(a.sport), borderRadius: '16px 0 0 16px' }} />
                <Avatar url={who?.avatar_url ?? null} name={name} size={38} />
                <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: sportColor(a.sport), flexShrink: 0 }} />
                    <span style={{ fontFamily: DISP, fontSize: 15, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{name} · {sportLabel(a.sport)} · {relDate(a.started_at)}</div>
                </div>
                <div style={{ display: 'flex', gap: 16, flexShrink: 0 }}>
                  {metrics.map((m, i) => <span key={i} style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{m}</span>)}
                </div>
                <button onClick={e => { e.preventDefault(); e.stopPropagation(); analyze(a) }}
                  style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 12px', borderRadius: 10, border: '1px solid color-mix(in srgb, var(--primary) 40%, var(--border))', background: 'color-mix(in srgb, var(--primary) 9%, transparent)', color: 'var(--primary)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: BODY }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" /></svg>
                  Analyser
                </button>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
