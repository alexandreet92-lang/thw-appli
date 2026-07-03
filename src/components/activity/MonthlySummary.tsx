'use client'
// ══════════════════════════════════════════════════════════════════
// MonthlySummary — récap animé du mois précédent, affiché les 3 PREMIERS jours
// du mois dans l'onglet Données. Partageable (image, comme Strava). Masquable.
// ══════════════════════════════════════════════════════════════════
import { useMemo, useState } from 'react'
import { IconShare2, IconX } from '@tabler/icons-react'
import { SPORT_ICON, sportKeyFromType } from '@/components/icons/SportIcon'
import { shareCard } from '@/lib/share/shareCard'
import { RecapStory, type RecapAct } from './RecapStory'
import { useI18n } from '@/lib/i18n'

const LOCALE: Record<string, string> = { fr: 'fr-FR', en: 'en-US', es: 'es-ES' }

function fmtH(s: number): string { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m} min` }

export function MonthlySummary({ activities }: { activities: RecapAct[] }) {
  const { t, lang } = useI18n()
  const [storyOpen, setStoryOpen] = useState(false)
  const now = new Date()
  const monthKey = `${now.getFullYear()}-${now.getMonth()}`
  const [dismissed, setDismissed] = useState(() => {
    try { return typeof window !== 'undefined' && window.localStorage.getItem(`monthly-dismiss-${monthKey}`) === '1' } catch { return false }
  })

  const data = useMemo(() => {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const end = new Date(now.getFullYear(), now.getMonth(), 1)
    const acts = activities.filter(a => { const d = new Date(a.started_at); return d >= start && d < end })
    const time = acts.reduce((s, a) => s + (a.moving_time_s ?? 0), 0)
    const dist = acts.reduce((s, a) => s + (a.distance_m ?? 0), 0)
    const sm = acts.reduce((s, a) => s + (a.tss ?? 0), 0)
    const bySport = new Map<string, number>()
    acts.forEach(a => { const k = sportKeyFromType(a.sport_type) ?? a.sport_type; bySport.set(k, (bySport.get(k) ?? 0) + (a.moving_time_s ?? 0)) })
    const top = [...bySport.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
    const best = acts.slice().sort((a, b) => (b.tss ?? 0) - (a.tss ?? 0))[0] ?? null
    const label = start.toLocaleDateString(LOCALE[lang] ?? 'fr-FR', { month: 'long', year: 'numeric' })
    return { count: acts.length, time, dist, sm, top, best, label }
  }, [activities, lang]) // eslint-disable-line react-hooks/exhaustive-deps

  if (now.getDate() > 3 || dismissed || data.count === 0) return null

  const topCfg = data.top && (data.top in SPORT_ICON) ? SPORT_ICON[data.top as keyof typeof SPORT_ICON] : null
  const accent = topCfg?.color ?? '#06B6D4'

  function dismiss() { try { window.localStorage.setItem(`monthly-dismiss-${monthKey}`, '1') } catch { /* ignore */ } setDismissed(true) }
  function onShare() {
    void shareCard({
      title: t('activities.msShareTitle', { label: data.label }),
      subtitle: t('activities.msShareSubtitle'),
      accent,
      stats: [
        { label: t('activities.msSessions'), value: String(data.count) },
        { label: t('activities.msTime'), value: fmtH(data.time) },
        { label: t('activities.msDistance'), value: data.dist > 0 ? `${Math.round(data.dist / 1000)} km` : '—' },
        { label: t('activities.msSmTotal'), value: String(Math.round(data.sm)) },
      ],
      filename: 'hybrid-mois.png',
    })
  }

  const stat = (label: string, value: string) => (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.55)' }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', lineHeight: 1.1, marginTop: 3 }}>{value}</div>
    </div>
  )

  return (
    <div style={{
      position: 'relative', borderRadius: 18, padding: '18px 18px 20px', marginBottom: 16, overflow: 'hidden',
      background: `linear-gradient(135deg, ${accent} 0%, #0b0b0f 130%)`,
      animation: 'monthlyIn 0.5s cubic-bezier(0.2,0.8,0.2,1)',
    }}>
      <style>{'@keyframes monthlyIn{from{opacity:0;transform:translateY(14px) scale(0.98)}to{opacity:1;transform:none}}'}</style>
      <button onClick={dismiss} aria-label={t('activities.msHide')} style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 28, height: 28, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconX size={15} /></button>
      <style>{`@keyframes recapPulse{0%,100%{box-shadow:0 4px 14px rgba(0,0,0,0.22)}50%{box-shadow:0 4px 22px ${accent}99}}`}</style>
      {storyOpen && <RecapStory period="month" activities={activities} onClose={() => setStoryOpen(false)} />}
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.7)' }}>{t('activities.msTitle')}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', textTransform: 'capitalize', margin: '2px 0 16px' }}>{data.label}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 16 }}>
        {stat(t('activities.msSessions'), String(data.count))}
        {stat(t('activities.msTime'), fmtH(data.time))}
        {data.dist > 0 ? stat(t('activities.msDistance'), `${Math.round(data.dist / 1000)} km`) : stat(t('activities.msSmTotal'), String(Math.round(data.sm)))}
        {data.best ? stat(t('activities.msTopSession'), t('activities.msTopVal', { n: Math.round(data.best.tss ?? 0) })) : stat(t('activities.msSmTotal'), String(Math.round(data.sm)))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onShare} style={{
          display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 999,
          background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff',
          fontSize: 13, fontWeight: 700, cursor: 'pointer',
        }}><IconShare2 size={15} /> {t('activities.msShare')}</button>
        <div style={{ flex: 1 }} />
        {/* Ouvrir la surpage récap détaillé (stories) */}
        <button onClick={() => setStoryOpen(true)} aria-label={t('activities.msOpen')} style={{
          width: 42, height: 42, borderRadius: '50%', background: '#fff', border: 'none', flexShrink: 0,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'recapPulse 2.4s ease-in-out infinite',
        }}>
          <svg width="15" height="16" viewBox="0 0 15 16" aria-hidden><path d="M2 1.5v13l11-6.5z" fill={accent} /></svg>
        </button>
      </div>
    </div>
  )
}
