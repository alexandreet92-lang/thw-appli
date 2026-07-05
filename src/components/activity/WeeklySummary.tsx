'use client'
// ══════════════════════════════════════════════════════════════════
// WeeklySummary — récap animé de la semaine écoulée, affiché LUNDI et MARDI
// de la semaine suivante dans l'onglet Données. Bouton ▶ → surpage stories.
// Même logique que MonthlySummary mais fenêtre hebdo (lundi→dimanche).
// ══════════════════════════════════════════════════════════════════
import { useMemo, useState } from 'react'
import { IconShare2, IconX } from '@tabler/icons-react'
import { SPORT_ICON, sportKeyFromType } from '@/components/icons/SportIcon'
import { shareCard } from '@/lib/share/shareCard'
import { RecapStory, type RecapAct } from './RecapStory'
import { useI18n } from '@/lib/i18n'
import { currentLocale } from '@/lib/i18n'

function fmtH(s: number): string { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m} min` }
function getMonday(d: Date): Date { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); const dow = (x.getDay() + 6) % 7; x.setDate(x.getDate() - dow); return x }

export function WeeklySummary({ activities }: { activities: RecapAct[] }) {
  const { t } = useI18n()
  const now = new Date()
  const weekKey = getMonday(now).toISOString().slice(0, 10)
  const [storyOpen, setStoryOpen] = useState(false)
  const [dismissed, setDismissed] = useState(() => {
    try { return typeof window !== 'undefined' && window.localStorage.getItem(`weekly-dismiss-${weekKey}`) === '1' } catch { return false }
  })

  const data = useMemo(() => {
    const mon = getMonday(now)
    const start = new Date(mon); start.setDate(start.getDate() - 7)   // semaine écoulée
    const end = mon
    const acts = activities.filter(a => { const d = new Date(a.started_at); return d >= start && d < end })
    const time = acts.reduce((s, a) => s + (a.moving_time_s ?? 0), 0)
    const dist = acts.reduce((s, a) => s + (a.distance_m ?? 0), 0)
    const sm = acts.reduce((s, a) => s + (a.tss ?? 0), 0)
    const bySport = new Map<string, number>()
    acts.forEach(a => { const k = sportKeyFromType(a.sport_type) ?? a.sport_type; bySport.set(k, (bySport.get(k) ?? 0) + (a.moving_time_s ?? 0)) })
    const top = [...bySport.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
    const best = acts.slice().sort((a, b) => (b.tss ?? 0) - (a.tss ?? 0))[0] ?? null
    const label = `${start.getDate()} – ${new Date(end.getTime() - 86400000).getDate()} ${new Date(end.getTime() - 86400000).toLocaleDateString(currentLocale(), { month: 'long' })}`
    return { count: acts.length, time, dist, sm, top, best, label }
  }, [activities]) // eslint-disable-line react-hooks/exhaustive-deps

  // Affiché uniquement lundi (1) et mardi (2).
  const dow = now.getDay()
  if ((dow !== 1 && dow !== 2) || dismissed || data.count === 0) return null

  const topCfg = data.top && (data.top in SPORT_ICON) ? SPORT_ICON[data.top as keyof typeof SPORT_ICON] : null
  const accent = topCfg?.color ?? '#06B6D4'

  function dismiss() { try { window.localStorage.setItem(`weekly-dismiss-${weekKey}`, '1') } catch { /* ignore */ } setDismissed(true) }
  function onShare() {
    void shareCard({
      title: t('lo.myWeekShareTitle', { label: data.label }), subtitle: t('lo.recapWeekly'), accent,
      stats: [
        { label: t('lo.sessions'), value: String(data.count) },
        { label: t('lo.time'), value: fmtH(data.time) },
        { label: t('lo.distance'), value: data.dist > 0 ? `${Math.round(data.dist / 1000)} km` : '—' },
        { label: t('lo.smTotal'), value: String(Math.round(data.sm)) },
      ], filename: 'hybrid-semaine.png',
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
      animation: 'weeklyIn 0.5s cubic-bezier(0.2,0.8,0.2,1)',
    }}>
      <style>{`@keyframes weeklyIn{from{opacity:0;transform:translateY(14px) scale(0.98)}to{opacity:1;transform:none}}@keyframes recapPulseW{0%,100%{box-shadow:0 4px 14px rgba(0,0,0,0.22)}50%{box-shadow:0 4px 22px ${accent}99}}`}</style>
      {storyOpen && <RecapStory period="week" activities={activities} onClose={() => setStoryOpen(false)} />}
      <button onClick={dismiss} aria-label={t('lo.hide')} style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 28, height: 28, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconX size={15} /></button>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.7)' }}>{t('lo.recapWeekLong')}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', textTransform: 'capitalize', margin: '2px 0 16px' }}>{data.label}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 16 }}>
        {stat(t('lo.sessions'), String(data.count))}
        {stat(t('lo.time'), fmtH(data.time))}
        {data.dist > 0 ? stat(t('lo.distance'), `${Math.round(data.dist / 1000)} km`) : stat(t('lo.smTotal'), String(Math.round(data.sm)))}
        {data.best ? stat(t('lo.topSession'), `SM ${Math.round(data.best.tss ?? 0)}`) : stat(t('lo.smTotal'), String(Math.round(data.sm)))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onShare} style={{
          display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 999,
          background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff',
          fontSize: 13, fontWeight: 700, cursor: 'pointer',
        }}><IconShare2 size={15} /> {t('lo.shareMyWeek')}</button>
        <div style={{ flex: 1 }} />
        <button onClick={() => setStoryOpen(true)} aria-label={t('lo.openDetailedRecap')} style={{
          width: 42, height: 42, borderRadius: '50%', background: '#fff', border: 'none', flexShrink: 0,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'recapPulseW 2.4s ease-in-out infinite',
        }}>
          <svg width="15" height="16" viewBox="0 0 15 16" aria-hidden><path d="M2 1.5v13l11-6.5z" fill={accent} /></svg>
        </button>
      </div>
    </div>
  )
}
