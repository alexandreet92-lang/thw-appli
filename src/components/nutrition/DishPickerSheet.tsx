'use client'
// ══════════════════════════════════════════════════════════════════
// DishPickerSheet — sélecteur de « plats » composés (catalogue dishes).
// Bottom-sheet à grille de photos + filtres par thème (catégories).
// Sélection → ajustement du grammage → onSelect(dish, grams).
// ══════════════════════════════════════════════════════════════════
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  fetchDishes, getRecentDishes, saveToRecentDishes, dishMacros,
  DISH_CATEGORIES, type DishItem,
} from '@/lib/dish-search'
import { useI18n } from '@/lib/i18n'

const CYAN = '#06B6D4'

interface Props {
  onSelect: (dish: DishItem, grams: number) => void
  onClose:  () => void
}

function DishCard({ dish, onSelect }: { dish: DishItem; onSelect: (d: DishItem) => void }) {
  const kcalPortion = Math.round(dish.kcal_100g * dish.default_portion_g / 100)
  return (
    <button
      onClick={() => onSelect(dish)}
      style={{
        display: 'flex', flexDirection: 'column', textAlign: 'left', padding: 0,
        border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden',
        background: 'var(--bg-card2)', cursor: 'pointer', minHeight: 44,
      }}
    >
      <div style={{ width: '100%', aspectRatio: '4 / 3', background: 'var(--border)', position: 'relative' }}>
        {dish.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={dish.image_url} alt="" loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="1.6" strokeLinecap="round"><path d="M3 11h18M5 11V7a2 2 0 012-2h10a2 2 0 012 2v4M4 11l1 8a2 2 0 002 2h10a2 2 0 002-2l1-8"/></svg>
          </div>
        )}
      </div>
      <div style={{ padding: '8px 10px 10px' }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--text)', fontFamily: 'DM Sans,sans-serif', lineHeight: 1.25, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {dish.name}
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: CYAN, fontFamily: 'DM Mono,monospace', fontWeight: 700 }}>
          {kcalPortion} kcal
          <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}> · {dish.default_portion_g}g</span>
        </p>
      </div>
    </button>
  )
}

function GridSkeleton() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, padding: '4px 16px 16px' }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
          <div style={{ width: '100%', aspectRatio: '4 / 3', background: 'var(--border)', animation: 'pulse 1.4s ease-in-out infinite' }} />
          <div style={{ padding: '8px 10px 10px' }}>
            <div style={{ height: 12, borderRadius: 6, background: 'var(--border)', width: '80%', animation: 'pulse 1.4s ease-in-out infinite' }} />
            <div style={{ height: 10, borderRadius: 4, background: 'var(--border)', width: '40%', marginTop: 6, opacity: 0.6, animation: 'pulse 1.4s ease-in-out infinite' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export function DishPickerSheet({ onSelect, onClose }: Props) {
  const { t } = useI18n()
  const [query,    setQuery]    = useState('')
  const [category, setCategory] = useState('all')
  const [items,    setItems]    = useState<DishItem[]>([])
  const [recents,  setRecents]  = useState<DishItem[]>([])
  const [loading,  setLoading]  = useState(true)
  const [pending,  setPending]  = useState<DishItem | null>(null)
  const [grams,    setGrams]    = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setRecents(getRecentDishes()) }, [])

  const load = useCallback(async (q: string, cat: string) => {
    setLoading(true)
    setItems(await fetchDishes({ query: q, category: cat }))
    setLoading(false)
  }, [])

  // Debounce sur la saisie ; rechargement immédiat au changement de thème.
  useEffect(() => {
    const handler = setTimeout(() => { void load(query, category) }, query.trim() ? 320 : 0)
    return () => clearTimeout(handler)
  }, [query, category, load])

  function handleSelect(dish: DishItem) {
    setPending(dish)
    setGrams(dish.default_portion_g)
  }

  function handleConfirm() {
    if (!pending) return
    const g = grams > 0 ? grams : pending.default_portion_g
    saveToRecentDishes(pending)
    onSelect(pending, g)
  }

  const showRecents = !query.trim() && category === 'all' && recents.length > 0
  const showEmpty   = !loading && items.length === 0
  const macros      = pending ? dishMacros(pending, grams || pending.default_portion_g) : null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={onClose} />
      <div style={{ position: 'relative', background: 'var(--bg-card)', borderRadius: '16px 16px 0 0', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 -8px 40px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 8px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)' }} />
        </div>

        {/* Search bar */}
        <div style={{ padding: '0 16px 10px', display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} placeholder={t('lo.searchDish')}
              style={{ width: '100%', padding: '9px 9px 9px 32px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-card2)', fontSize: 14, color: 'var(--text)', fontFamily: 'DM Sans,sans-serif', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <button onClick={onClose} style={{ width: 40, height: 40, borderRadius: 8, border: 'none', background: 'var(--bg-card2)', cursor: 'pointer', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Filtres par thème (chips) */}
        {!pending && (
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '0 16px 12px', WebkitOverflowScrolling: 'touch' }}>
            {DISH_CATEGORIES.map(c => {
              const active = category === c.key
              return (
                <button key={c.key} onClick={() => setCategory(c.key)}
                  style={{
                    flexShrink: 0, padding: '8px 14px', borderRadius: 999, minHeight: 36, cursor: 'pointer',
                    border: `1px solid ${active ? CYAN : 'var(--border)'}`,
                    background: active ? `${CYAN}1f` : 'transparent',
                    color: active ? CYAN : 'var(--text-mid)',
                    fontFamily: 'DM Sans,sans-serif', fontSize: 12, fontWeight: active ? 700 : 500, whiteSpace: 'nowrap',
                  }}>
                  {c.label}
                </button>
              )
            })}
          </div>
        )}

        {/* Confirm grammage */}
        {pending && macros && (
          <div style={{ margin: '0 16px 12px', padding: '12px 14px', borderRadius: 12, background: 'var(--bg-card2)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              {pending.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={pending.image_url} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text)', fontFamily: 'DM Sans,sans-serif', lineHeight: 1.25 }}>{pending.name}</p>
                <div style={{ display: 'flex', gap: 10, marginTop: 4, fontFamily: 'DM Mono,monospace', fontSize: 11 }}>
                  <span style={{ color: CYAN, fontWeight: 700 }}>{macros.kcal} kcal</span>
                  <span style={{ color: 'var(--text-dim)' }}>{t('lo.macroProt')} {macros.prot}</span>
                  <span style={{ color: 'var(--text-dim)' }}>{t('lo.macroGluc')} {macros.gluc}</span>
                  <span style={{ color: 'var(--text-dim)' }}>{t('lo.macroLip')} {macros.lip}</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={() => setGrams(g => Math.max(10, g - 10))} style={{ width: 44, height: 44, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: 20, cursor: 'pointer', flexShrink: 0 }}>−</button>
              <div style={{ flex: 1, textAlign: 'center', fontFamily: 'DM Mono,monospace', fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>{grams} g</div>
              <button onClick={() => setGrams(g => g + 10)} style={{ width: 44, height: 44, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: 20, cursor: 'pointer', flexShrink: 0 }}>+</button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button onClick={() => setPending(null)} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-dim)', fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>{t('lo.back')}</button>
              <button onClick={handleConfirm} style={{ flex: 2, padding: '10px 0', borderRadius: 8, border: 'none', background: `linear-gradient(135deg,${CYAN},#3B82F6)`, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Syne,sans-serif' }}>{t('lo.addToMeal')}</button>
            </div>
          </div>
        )}

        {/* Grille */}
        {!pending && (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading && <GridSkeleton />}

            {!loading && (
              <>
                {showRecents && (
                  <>
                    <p style={{ padding: '4px 16px 6px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', margin: 0 }}>{t('lo.recentlyUsed')}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, padding: '0 16px 12px' }}>
                      {recents.map(d => <DishCard key={d.id} dish={d} onSelect={handleSelect} />)}
                    </div>
                  </>
                )}

                {!showEmpty && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, padding: '4px 16px 16px' }}>
                    {items.map(d => <DishCard key={d.id} dish={d} onSelect={handleSelect} />)}
                  </div>
                )}

                {showEmpty && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 24px', gap: 10 }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="1.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                    <p style={{ fontSize: 13, color: 'var(--text-dim)', textAlign: 'center', margin: 0, lineHeight: 1.5 }}>
                      {query.trim() ? t('lo.noDishFound', { q: query }) : t('lo.noDishInTheme')}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
