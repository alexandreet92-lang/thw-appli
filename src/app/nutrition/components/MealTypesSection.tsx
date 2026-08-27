'use client'
import { useState } from 'react'
import type { MealTemplate, MealTiming } from '@/hooks/useNutrition'
import MealCreateModal from './MealCreateModal'
import { useI18n } from '@/lib/i18n'

type Filter = 'all' | 'favorites' | MealTiming

const TIMING_COLORS: Record<MealTiming, { bg: string; color: string }> = {
  pre_training:  { bg: 'rgba(6,182,212,0.14)',  color: '#06B6D4' },
  post_training: { bg: 'rgba(59,130,246,0.14)', color: '#3B82F6' },
  morning:       { bg: 'rgba(234,179,8,0.14)',  color: '#CA8A04' },
  evening:       { bg: 'rgba(139,92,246,0.14)', color: '#8B5CF6' },
  rest:          { bg: 'rgba(34,197,94,0.14)',  color: '#16A34A' },
}

// Sparkle icon (SVG path)
function SparkleIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
    </svg>
  )
}

// Plate icon placeholder
function PlateIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" opacity={0.3}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12h8" />
      <path d="M12 8v8" />
    </svg>
  )
}

export default function MealTypesSection({
  templates,
  loading,
  onAdd,
  onUpdate,
  onDelete,
  onOpenAI,
}: {
  templates: MealTemplate[]
  loading: boolean
  onAdd: (t: Omit<MealTemplate, 'id' | 'user_id' | 'created_at'>) => Promise<void>
  onUpdate: (id: string, t: Partial<Omit<MealTemplate, 'id' | 'user_id' | 'created_at'>>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onOpenAI: (prompt: string) => void
}) {
  const { t } = useI18n()
  const [filter, setFilter] = useState<Filter>('all')
  const [creating, setCreating] = useState(false)

  const filtered = templates.filter(tpl => {
    if (!tpl.actif) return false
    if (filter === 'favorites') return tpl.is_favorite
    if (filter === 'all') return true
    return tpl.meal_timing === filter
  })

  async function toggleFavorite(tpl: MealTemplate) {
    await onUpdate(tpl.id, { is_favorite: !tpl.is_favorite })
  }

  async function handleDelete(id: string) {
    if (!confirm(t('w2a.delete_meal_type_confirm'))) return
    await onDelete(id)
  }

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'all',          label: t('w2a.filter_all')             },
    { key: 'favorites',    label: t('w2a.filter_favorites')       },
    { key: 'pre_training', label: t('w2a.timing_pre_training')    },
    { key: 'post_training',label: t('w2a.timing_post_training')   },
    { key: 'morning',      label: t('w2a.timing_morning')         },
    { key: 'evening',      label: t('w2a.timing_evening')         },
    { key: 'rest',         label: t('w2a.timing_rest')            },
  ]

  function handleAISuggest() {
    const timingLabel = (filter !== 'all' && filter !== 'favorites')
      ? t(`w2a.timing_${filter}`)
      : t('w2a.ai_all_meal_types')
    onOpenAI(t('w2a.ai_suggest_prompt', { timing: timingLabel }))
  }

  const cardStyle: React.CSSProperties = {
    background: 'var(--bg-card)',
    borderRadius: 16,
    border: '1px solid var(--border)',
    padding: 20,
    marginBottom: 16,
  }

  return (
    <div style={cardStyle}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text)' }}>
          {t('w2a.my_meal_types')}
        </h2>
        <button
          onClick={() => setCreating(true)}
          style={{
            padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(90deg,#06B6D4,#3B82F6)',
            color: '#fff', fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 12,
            whiteSpace: 'nowrap',
          }}
        >{t('w2a.create_meal_plus')}</button>
      </div>

      {/* Filters + AI button */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {FILTERS.map(({ key, label }) => {
          const active = filter === key
          return (
            <button key={key}
              onClick={() => setFilter(key)}
              style={{
                padding: '4px 11px', borderRadius: 20, cursor: 'pointer',
                border: active ? 'none' : '1px solid var(--border)',
                background: active ? 'linear-gradient(90deg,#06B6D4,#3B82F6)' : 'transparent',
                color: active ? '#fff' : 'var(--text-dim)',
                fontWeight: active ? 700 : 400,
                fontSize: 10, fontFamily: 'Syne,sans-serif',
              }}
            >{label}</button>
          )
        })}

        <button
          onClick={handleAISuggest}
          style={{
            marginLeft: 'auto', padding: '4px 11px', borderRadius: 20, cursor: 'pointer',
            border: '1px solid var(--border)', background: 'transparent',
            color: 'var(--text-dim)', fontSize: 10, fontFamily: 'Syne,sans-serif',
            display: 'flex', alignItems: 'center', gap: 5,
          }}
        >
          <SparkleIcon />
          {t('w2a.ai_suggest_btn')}
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ color: 'var(--text-dim)', fontSize: 13, padding: '24px 0', textAlign: 'center' }}>
          {t('w2a.loading')}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ color: 'var(--text-dim)', fontSize: 13, padding: '24px 0', textAlign: 'center' }}>
          {filter === 'all'
            ? t('w2a.no_meal_type')
            : t('w2a.no_meal_in_category')}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}
          className="meal-types-grid">
          {filtered.map(tpl => {
            const timing = tpl.meal_timing as MealTiming | null
            const tc = timing ? TIMING_COLORS[timing] : null

            return (
              <div key={tpl.id} style={{
                background: 'var(--bg-card2)', border: '1px solid var(--border)',
                borderRadius: 12, overflow: 'hidden', position: 'relative',
              }}>
                {/* Photo zone */}
                <div style={{
                  height: 160, background: 'var(--bg-card)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden', position: 'relative', color: 'var(--text-dim)',
                }}>
                  {tpl.photo_url ? (
                    <img src={tpl.photo_url} alt={tpl.nom}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  ) : (
                    <PlateIcon />
                  )}

                  {/* Favorite star */}
                  <button
                    onClick={() => void toggleFavorite(tpl)}
                    title={tpl.is_favorite ? t('w2a.remove_favorite') : t('w2a.add_favorite')}
                    style={{
                      position: 'absolute', top: 8, right: 8,
                      width: 30, height: 30, borderRadius: 8,
                      background: 'rgba(0,0,0,0.45)', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24"
                      fill={tpl.is_favorite ? '#F59E0B' : 'none'}
                      stroke={tpl.is_favorite ? '#F59E0B' : '#fff'} strokeWidth="2">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => void handleDelete(tpl.id)}
                    title={t('w2a.delete')}
                    style={{
                      position: 'absolute', top: 8, left: 8,
                      width: 30, height: 30, borderRadius: 8,
                      background: 'rgba(0,0,0,0.45)', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                      <path d="M10 11v6M14 11v6M9 6V4h6v2" />
                    </svg>
                  </button>
                </div>

                {/* Body */}
                <div style={{ padding: 12 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', marginBottom: 6, lineHeight: 1.3 }}>
                    {tpl.nom}
                  </div>

                  {timing && tc && (
                    <div style={{ marginBottom: 6 }}>
                      <span style={{
                        padding: '2px 9px', borderRadius: 20, fontSize: 9, fontWeight: 700,
                        background: tc.bg, color: tc.color, fontFamily: 'Syne,sans-serif',
                      }}>{t(`w2a.timing_${timing}`)}</span>
                    </div>
                  )}

                  {(tpl.kcal || tpl.proteines || tpl.glucides || tpl.lipides) && (
                    <div style={{ fontSize: 10, color: 'var(--text-dim)', lineHeight: 1.5, marginBottom: 4 }}>
                      {[
                        tpl.kcal       != null ? `${tpl.kcal} kcal`         : null,
                        tpl.proteines  != null ? t('w2a.macro_prot', { n: tpl.proteines }) : null,
                        tpl.glucides   != null ? t('w2a.macro_gluc', { n: tpl.glucides })  : null,
                        tpl.lipides    != null ? t('w2a.macro_lip', { n: tpl.lipides })    : null,
                      ].filter(Boolean).join(' · ')}
                    </div>
                  )}

                  {tpl.recommended_frequency_per_week != null && tpl.recommended_frequency_per_week > 0 && (
                    <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                      {t('w2a.freq_recommended', { n: tpl.recommended_frequency_per_week })}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <style>{`@media (max-width:640px){.meal-types-grid{grid-template-columns:1fr!important}}`}</style>

      {creating && (
        <MealCreateModal
          onSave={async data => { await onAdd(data); setCreating(false) }}
          onClose={() => setCreating(false)}
        />
      )}
    </div>
  )
}
