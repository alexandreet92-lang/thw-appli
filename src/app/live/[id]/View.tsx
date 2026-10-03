'use client'
// ══════════════════════════════════════════════════════════════════════════
// Suivi en direct PUBLIC (façon Strava Beacon / Garmin LiveTrack) : la page
// qu'ouvre un proche depuis WhatsApp / Messages — SANS compte. Carte plein
// écran + position courante (halo pulsé) + trace reconstituée pendant la
// consultation, en-tête (prénom, « En direct » / « Sortie terminée »),
// panneau bas (distance, durée, vitesse moyenne, dernière mise à jour).
// Données : /api/live/<id> (service role, champs minimaux), sondé toutes les
// 5 s tant que l'onglet est visible.
// Vue 100 % client (lit l'id via useParams) — le wrapper serveur page.tsx
// fournit generateStaticParams pour l'export statique Capacitor (phase 5).
// ══════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import './live.css'

const LiveMap = dynamic(() => import('./LiveMap'), { ssr: false })

interface PublicShare {
  id: string; name: string | null; avatar: string | null; sport: string | null
  active: boolean; expired: boolean; lat: number | null; lng: number | null
  elapsedS: number; distanceM: number; startedAt: string; updatedAt: string; endedAt: string | null
}
interface LL { lat: number; lng: number }

const POLL_MS = 5000
const STALE_MS = 2 * 60 * 1000

function fmtDur(s: number): string {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60)
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`
}
function fmtKm(m: number): string { return (m / 1000).toFixed(m < 10000 ? 2 : 1).replace('.', ',') }

export default function LiveTrackView() {
  const { t: tr } = useI18n()
  const t = useCallback((key: string, fr: string, vars?: Record<string, string | number>) => {
    const v = tr(key, vars)
    if (v !== key) return v
    let s = fr
    if (vars) for (const [k, val] of Object.entries(vars)) s = s.replace(`{${k}}`, String(val))
    return s
  }, [tr])
  const params = useParams<{ id: string }>()
  const id = params?.id
  const [share, setShare] = useState<PublicShare | null>(null)
  const [state, setState] = useState<'loading' | 'ok' | 'missing' | 'error'>('loading')
  const [trail, setTrail] = useState<LL[]>([])
  const [now, setNow] = useState(() => Date.now())
  const [recenterKey, setRecenterKey] = useState(0)
  const [topH, setTopH] = useState(90)
  const [bottomH, setBottomH] = useState(170)
  const topRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Sondage de la session (pause quand l'onglet est masqué).
  useEffect(() => {
    if (!id) return
    let alive = true
    let timer: ReturnType<typeof setTimeout> | null = null
    const load = async () => {
      try {
        const res = await fetch(`/api/live/${encodeURIComponent(id)}`, { cache: 'no-store' })
        if (!alive) return
        if (res.status === 404) { setState('missing'); return }
        if (!res.ok) { setState(s => (s === 'ok' ? s : 'error')); return }
        const j = (await res.json()) as { share?: PublicShare }
        if (!alive || !j.share) return
        const sh = j.share
        setShare(sh)
        setState('ok')
        if (sh.lat != null && sh.lng != null) {
          const p = { lat: sh.lat, lng: sh.lng }
          setTrail(tr0 => {
            const last = tr0[tr0.length - 1]
            if (last && Math.abs(last.lat - p.lat) < 1e-6 && Math.abs(last.lng - p.lng) < 1e-6) return tr0
            return [...tr0, p].slice(-2000)
          })
        }
      } catch {
        if (alive) setState(s => (s === 'ok' ? s : 'error'))
      }
    }
    const loop = async () => {
      if (document.visibilityState === 'visible') await load()
      if (alive) timer = setTimeout(() => { void loop() }, POLL_MS)
    }
    void loop()
    const onVis = () => { if (document.visibilityState === 'visible') void load() }
    document.addEventListener('visibilitychange', onVis)
    return () => { alive = false; if (timer) clearTimeout(timer); document.removeEventListener('visibilitychange', onVis) }
  }, [id])

  // Horloge d'affichage (« mis à jour il y a … », durée qui avance).
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(iv)
  }, [])

  // Hauteurs réelles des panneaux → position centrée dans la zone visible.
  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => {
      if (topRef.current) setTopH(topRef.current.getBoundingClientRect().bottom)
      if (bottomRef.current) setBottomH(window.innerHeight - bottomRef.current.getBoundingClientRect().top)
    })
    if (topRef.current) ro.observe(topRef.current)
    if (bottomRef.current) ro.observe(bottomRef.current)
    return () => ro.disconnect()
  }, [state])

  // ── États sans carte ──
  if (state === 'loading') {
    return (
      <div className="lt-root" aria-busy="true">
        <div style={{ position: 'absolute', inset: 0, background: 'var(--surface-chip, var(--bg-card2))', opacity: 0.6 }} />
        <div className="lt-card" style={{ position: 'absolute', left: 12, right: 12, top: 'calc(env(safe-area-inset-top) + 10px)', padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="lt-skel" style={{ width: 44, height: 44, borderRadius: '50%' }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="lt-skel" style={{ height: 16, width: '45%' }} />
            <div className="lt-skel" style={{ height: 12, width: '30%' }} />
          </div>
        </div>
        <div className="lt-card" style={{ position: 'absolute', left: 12, right: 12, bottom: 'calc(env(safe-area-inset-bottom) + 12px)', padding: 18, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div className="lt-skel" style={{ height: 12, width: '60%' }} />
              <div className="lt-skel" style={{ height: 26, width: '80%' }} />
            </div>
          ))}
        </div>
        <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>{t('live.loading', 'Chargement…')}</span>
      </div>
    )
  }

  if (state !== 'ok' || !share || share.expired) {
    const title = share?.expired ? t('live.expiredTitle', 'Ce suivi est terminé') : t('live.missingTitle', 'Suivi introuvable')
    const body = share?.expired
      ? t('live.expiredBody', 'La sortie est terminée depuis plus de 24 h : la position n’est plus partagée.')
      : state === 'error'
        ? t('live.errorBody', 'Connexion impossible pour le moment. Vérifie ton réseau, la page se réessaie toute seule.')
        : t('live.missingBody', 'Ce lien de suivi n’existe pas ou a été supprimé. Demande à ton proche de te renvoyer le lien.')
    return (
      <div className="lt-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div className="lt-in" style={{ textAlign: 'center', maxWidth: 340 }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, margin: '0 0 8px', color: 'var(--text)' }}>{title}</p>
          <p style={{ fontSize: 14, color: 'var(--text-mid)', margin: 0, lineHeight: 1.5 }}>{body}</p>
          <Link href="/" style={{ display: 'inline-block', marginTop: 20, fontSize: 14, fontWeight: 600, color: 'var(--primary)', textDecoration: 'none' }}>
            {t('live.openApp', 'Découvrir l’app')}
          </Link>
        </div>
      </div>
    )
  }

  // ── Données ──
  const updatedMs = new Date(share.updatedAt).getTime()
  const agoS = Math.max(0, Math.round((now - updatedMs) / 1000))
  const stale = share.active && now - updatedMs > STALE_MS
  // Durée : poussée par l'écran d'enregistrement ; sinon temps écoulé depuis
  // le début du partage (+ dérive locale depuis la dernière mise à jour).
  const startMs = new Date(share.startedAt).getTime()
  const endMs = share.endedAt ? new Date(share.endedAt).getTime() : now
  const elapsedS = share.elapsedS > 0
    ? share.elapsedS + (share.active && !stale ? Math.max(0, (now - updatedMs) / 1000) : 0)
    : Math.max(0, (endMs - startMs) / 1000)
  const durLabel = share.elapsedS > 0 ? t('live.duration', 'Durée') : t('live.since', 'Depuis')
  const avgKmh = share.distanceM > 0 && share.elapsedS > 0 ? (share.distanceM / 1000) / (share.elapsedS / 3600) : null
  const name = share.name || t('live.athlete', 'Athlète')
  const agoLabel = agoS < 10 ? t('live.updatedNow', 'Mis à jour à l’instant')
    : agoS < 60 ? t('live.updatedSec', 'Mis à jour il y a {s} s', { s: agoS })
    : agoS < 3600 ? t('live.updatedMin', 'Mis à jour il y a {m} min', { m: Math.floor(agoS / 60) })
    : t('live.updatedAt', 'Mis à jour à {h}', { h: new Date(updatedMs).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) })
  const statusText = !share.active ? t('live.ended', 'Sortie terminée')
    : stale ? t('live.signalLost', 'Signal perdu') : t('live.liveNow', 'En direct')
  const statusDot = !share.active ? 'var(--text-dim)' : stale ? 'var(--danger)' : 'var(--success)'
  const pos = share.lat != null && share.lng != null ? { lat: share.lat, lng: share.lng } : null

  const stat = (label: string, value: string, unit?: string) => (
    <div style={{ minWidth: 0, textAlign: 'center' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-mid)' }}>{label}</div>
      <div className="lt-num" style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.15, marginTop: 2, whiteSpace: 'nowrap', letterSpacing: '-0.02em' }}>
        {value}{unit && <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-mid)', letterSpacing: 0 }}> {unit}</span>}
      </div>
    </div>
  )

  return (
    <div className="lt-root">
      <div className="lt-map">
        {pos ? (
          <LiveMap pos={pos} trail={trail} active={share.active} recenterKey={recenterKey} padTop={topH} padBottom={bottomH} />
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'var(--surface-chip, var(--bg-card2))', color: 'var(--text-mid)', fontSize: 14, fontWeight: 600, padding: 24, textAlign: 'center' }}>
            <span className="lt-dot" data-live="1" style={{ background: 'var(--primary)' }} />
            {t('live.waitingFirst', 'En attente de la première position…')}
          </div>
        )}
      </div>

      {/* En-tête : prénom + état */}
      <div ref={topRef} className="lt-card lt-in" style={{
        position: 'absolute', left: 12, right: 12, top: 'calc(env(safe-area-inset-top) + 10px)', zIndex: 10,
        padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'var(--surface-chip, var(--bg-card2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18, color: 'var(--text-mid)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {share.avatar ? <img src={share.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : name.slice(0, 1).toUpperCase()}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {t('live.title', 'Sortie de {name}', { name })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 3, fontSize: 13, fontWeight: 600, color: 'var(--text-mid)' }}>
            <span className="lt-dot" data-live={share.active && !stale ? '1' : undefined} style={{ background: statusDot }} />
            {statusText}
          </div>
        </div>
      </div>

      {/* Recentrer */}
      {pos && (
        <button type="button" className="lt-fab" aria-label={t('live.recenter', 'Recentrer')} onClick={() => setRecenterKey(k => k + 1)}
          style={{ position: 'absolute', right: 12, top: topH + 12, zIndex: 10 }}>
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" /><circle cx="12" cy="12" r="6" />
          </svg>
        </button>
      )}

      {/* Panneau bas : données + dernière mise à jour */}
      <div ref={bottomRef} className="lt-card lt-in" style={{
        position: 'absolute', left: 12, right: 12, bottom: 'calc(env(safe-area-inset-bottom) + 12px)', zIndex: 10,
        padding: '16px 12px 12px',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
          {stat(t('live.distance', 'Distance'), share.distanceM > 0 ? fmtKm(share.distanceM) : '—', share.distanceM > 0 ? 'km' : undefined)}
          {stat(durLabel, fmtDur(elapsedS))}
          {stat(t('live.avgSpeed', 'Moyenne'), avgKmh != null ? avgKmh.toFixed(1).replace('.', ',') : '—', avgKmh != null ? 'km/h' : undefined)}
        </div>
        <div className="lt-num" style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontSize: 12, fontWeight: 500, color: 'var(--text-dim)' }}>
          {stale && <span className="lt-dot" style={{ width: 7, height: 7, background: statusDot }} />}
          {agoLabel}
        </div>
      </div>
    </div>
  )
}
