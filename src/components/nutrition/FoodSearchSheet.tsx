'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { searchFoods, getRecentFoods, saveToRecent, type FoodItem } from '@/lib/food-search'
import { COMMON_FOODS } from '@/lib/common-foods'
import { useI18n } from '@/lib/i18n'
import { MSheet, SheetHeader, useIsMobile } from '@/components/ai/mobile/MobileKit'

interface Props {
  onSelect: (food: FoodItem, grams: number) => void
  onClose: () => void
  initialBarcode?: string
}

function MacroPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <span style={{ fontSize: 10, color, fontFamily: 'var(--font-body)' }}>
      {label} {value}g
    </span>
  )
}

function FoodRow({ food, onSelect }: { food: FoodItem; onSelect: (food: FoodItem) => void }) {
  const n = food.nutriments
  return (
    <button
      onClick={() => onSelect(food)}
      style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '10px 16px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', gap: 10 }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-card2)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text)', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {food.product_name}
        </p>
        <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
          <span style={{ fontSize: 10, color: 'var(--primary)', fontFamily: 'var(--font-body)' }}>{n['energy-kcal_100g']} kcal</span>
          <MacroPill label="P" value={n.proteins_100g} color="#22c55e" />
          <MacroPill label="G" value={n.carbohydrates_100g} color="#eab308" />
          <MacroPill label="L" value={n.fat_100g} color="#f97316" />
        </div>
      </div>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
    </button>
  )
}

// Mobile : ligne de liste groupée ≥ 56 px (nom 16, macros grises 13).
function FoodRowMobile({ food, first, onSelect }: { food: FoodItem; first: boolean; onSelect: (food: FoodItem) => void }) {
  const n = food.nutriments
  return (
    <button type="button" onClick={() => onSelect(food)} className="thw-press"
      style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10, width: '100%', minHeight: 56, padding: '10px 16px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-body)' }}>
      {!first && <span aria-hidden style={{ position: 'absolute', top: 0, left: 16, right: 16, height: 1, background: 'var(--border)' }} />}
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 16, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{food.product_name}</span>
        <span style={{ display: 'block', marginTop: 2, fontSize: 13, color: 'var(--text-mid)', fontVariantNumeric: 'tabular-nums' }}>
          {n['energy-kcal_100g']} kcal · P {n.proteins_100g} · G {n.carbohydrates_100g} · L {n.fat_100g} g
        </span>
      </span>
      <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="m9 18 6-6-6-6" /></svg>
    </button>
  )
}

function Skeleton() {
  return (
    <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[72, 56, 64].map((w, i) => (
        <div key={i}>
          <div style={{ height: 13, borderRadius: 'var(--r-sm)', background: 'var(--border)', width: `${w}%`, animation: 'pulse 1.4s ease-in-out infinite' }} />
          <div style={{ height: 10, borderRadius: 4, background: 'var(--border)', width: '45%', marginTop: 5, animation: 'pulse 1.4s ease-in-out infinite', opacity: 0.6 }} />
        </div>
      ))}
    </div>
  )
}

export function FoodSearchSheet({ onSelect, onClose, initialBarcode }: Props) {
  const { t } = useI18n()
  const mobile = useIsMobile()
  const [shown, setShown] = useState(false)
  const [closing, setClosing] = useState(false)
  // Mobile : la feuille MSheet joue elle-même l'entrée/sortie (open → false puis démontage).
  const [mOpen, setMOpen] = useState(true)
  useEffect(() => { const r = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(r) }, [])
  const requestClose = () => { setClosing(true); setShown(false); setMOpen(false); setTimeout(onClose, 280) }
  const [query, setQuery] = useState(initialBarcode ?? '')
  const [loading, setLoading] = useState(!!initialBarcode)
  const [localResults, setLocalResults] = useState<FoodItem[]>([])
  const [apiResults, setApiResults] = useState<FoodItem[]>([])
  const [recentFoods, setRecentFoods] = useState<FoodItem[]>([])
  const [grams, setGrams] = useState('100')
  const [pending, setPending] = useState<FoodItem | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setRecentFoods(getRecentFoods())
    setTimeout(() => inputRef.current?.focus(), 80)
  }, [])

  useEffect(() => {
    if (initialBarcode) void runSearch(initialBarcode)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialBarcode])

  const runSearch = useCallback(async (q: string) => {
    setLoading(true)
    const { local, api } = await searchFoods(q)
    setLocalResults(local)
    setApiResults(api)
    setLoading(false)
  }, [])

  const handleChange = (val: string) => {
    setQuery(val)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!val.trim()) { setLocalResults([]); setApiResults([]); setLoading(false); return }
    setLoading(true)
    timerRef.current = setTimeout(() => void runSearch(val), 320)
  }

  const handleSelect = (food: FoodItem) => {
    setPending(food)
    setGrams('100')
  }

  const handleConfirm = () => {
    if (!pending) return
    const g = parseFloat(grams) || 100
    saveToRecent(pending)
    onSelect(pending, g)
  }

  const showEmpty = !loading && query.trim() && !localResults.length && !apiResults.length
  const showDefault = !query.trim()

  if (mobile) {
    const section = (label: string, foods: FoodItem[]) => (
      <section>
        <p style={{ margin: '0 20px 8px', fontSize: 13, fontWeight: 500, color: 'var(--text-mid)' }}>{label}</p>
        <div style={{ margin: '0 16px', background: 'var(--surface-chip)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
          {foods.map((f, i) => <FoodRowMobile key={f.code} food={f} first={i === 0} onSelect={handleSelect} />)}
        </div>
      </section>
    )
    const g = parseFloat(grams) || 100
    return (
      <MSheet open={mOpen} onClose={requestClose} zIndex={18800} label={t('nutrition.foodSearch.placeholder')}>
        <style>{'.fss-in:focus{box-shadow:0 0 0 2px var(--primary)}.fss-in::placeholder{color:var(--text-dim)}@keyframes fssPulse{0%,100%{opacity:.55}50%{opacity:1}}@media (prefers-reduced-motion: reduce){.fss-skel{animation:none!important}}'}</style>
        {pending ? (
          <SheetHeader leftLabel={t('nutrition.common.back')} onLeft={() => setPending(null)} title={pending.product_name}
            rightLabel={t('nutrition.common.add')} onRight={handleConfirm} />
        ) : (
          <SheetHeader leftLabel={t('nutrition.common.cancel')} onLeft={requestClose} title={t('nutrition.searchFood')} />
        )}

        {pending ? (
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px calc(24px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label htmlFor="fss-grams" style={{ display: 'block', margin: '0 0 6px 4px', fontSize: 13, fontWeight: 500, color: 'var(--text-mid)' }}>{t('nutrition.food.quantity')}</label>
              <div style={{ position: 'relative' }}>
                <input id="fss-grams" className="fss-in" type="number" inputMode="decimal" min="1" value={grams} onChange={e => setGrams(e.target.value)} autoFocus
                  style={{ width: '100%', minHeight: 52, padding: '0 44px 0 16px', boxSizing: 'border-box', border: 'none', borderRadius: 'var(--r-md)', background: 'var(--surface-chip)', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 22, fontWeight: 700, textAlign: 'right', outline: 'none', fontVariantNumeric: 'tabular-nums' }} />
                <span aria-hidden style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: 'var(--text-dim)' }}>g</span>
              </div>
            </div>
            <p style={{ margin: '0 4px', fontSize: 15, color: 'var(--text-mid)', fontVariantNumeric: 'tabular-nums' }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>{Math.round(pending.nutriments['energy-kcal_100g'] * g / 100)}</span> kcal · P {+((pending.nutriments.proteins_100g * g / 100).toFixed(1))} · G {+((pending.nutriments.carbohydrates_100g * g / 100).toFixed(1))} · L {+((pending.nutriments.fat_100g * g / 100).toFixed(1))} g
            </p>
            <button type="button" onClick={handleConfirm} className="thw-press"
              style={{ width: '100%', minHeight: 52, borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer', background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 700 }}>
              {t('nutrition.common.add')}
            </button>
          </div>
        ) : <>
          <div style={{ flexShrink: 0, padding: '4px 16px 12px' }}>
            <div style={{ position: 'relative' }}>
              <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <input ref={inputRef} className="fss-in" value={query} onChange={e => handleChange(e.target.value)} placeholder={t('nutrition.foodSearch.placeholder')}
                style={{ width: '100%', minHeight: 48, padding: '0 14px 0 42px', boxSizing: 'border-box', border: 'none', borderRadius: 'var(--r-pill)', background: 'var(--surface-chip)', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 16, outline: 'none' }} />
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', display: 'flex', flexDirection: 'column', gap: 18, paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}>
            {loading && (
              <div style={{ margin: '0 16px', background: 'var(--surface-chip)', borderRadius: 'var(--r-lg)', padding: '6px 16px' }}>
                {[72, 56, 64].map((w, i) => (
                  <div key={i} style={{ padding: '12px 0', borderTop: i ? '1px solid var(--border)' : 'none' }}>
                    <div className="fss-skel" style={{ height: 14, borderRadius: 'var(--r-sm)', background: 'var(--surface-bar)', width: `${w}%`, animation: 'fssPulse 1.4s ease-in-out infinite' }} />
                    <div className="fss-skel" style={{ height: 11, borderRadius: 'var(--r-sm)', background: 'var(--surface-bar)', width: '45%', marginTop: 6, opacity: 0.6, animation: 'fssPulse 1.4s ease-in-out infinite' }} />
                  </div>
                ))}
              </div>
            )}
            {!loading && showDefault && <>
              {recentFoods.length > 0 && section(t('nutrition.foodSearch.recent'), recentFoods)}
              {section(t('nutrition.foodSearch.frequent'), COMMON_FOODS)}
            </>}
            {!loading && !showDefault && <>
              {localResults.length > 0 && section(t('nutrition.foodSearch.library'), localResults)}
              {apiResults.length > 0 && section(t('nutrition.foodSearch.products'), apiResults)}
              {showEmpty && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 24px 0', gap: 10, textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>{t('nutrition.foodSearch.notFound', { query })}</p>
                  <p style={{ margin: 0, fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.45 }}>{t('nutrition.foodSearch.tryAgain')}</p>
                  <button type="button" onClick={requestClose}
                    style={{ marginTop: 6, minHeight: 44, padding: '0 20px', borderRadius: 'var(--r-pill)', border: 'none', background: 'var(--surface-chip)', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
                    {t('nutrition.foodSearch.manualEntry')}
                  </button>
                </div>
              )}
            </>}
          </div>
        </>}
      </MSheet>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', opacity: shown && !closing ? 1 : 0, transition: 'opacity 0.28s ease' }} onClick={requestClose} />
      <div style={{ position: 'relative', background: 'var(--bg-card)', borderRadius: '16px 16px 0 0', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 -8px 40px rgba(0,0,0,0.2)', transform: shown && !closing ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 0.30s cubic-bezier(0.32,0.72,0,1)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 8px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)' }} />
        </div>

        {/* Search bar */}
        <div style={{ padding: '0 16px 12px', display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input ref={inputRef} value={query} onChange={e => handleChange(e.target.value)} placeholder={t('nutrition.foodSearch.placeholder')} style={{ width: '100%', padding: '9px 9px 9px 32px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', background: 'var(--bg-card2)', fontSize: 14, color: 'var(--text)', fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <button onClick={requestClose} style={{ width: 34, height: 34, borderRadius: 'var(--r-sm)', border: 'none', background: 'var(--bg-card2)', cursor: 'pointer', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Confirm grams */}
        {pending && (
          <div style={{ margin: '0 16px 12px', padding: '12px 14px', borderRadius: 'var(--r-md)', background: 'var(--bg-card2)', border: '1px solid var(--border)' }}>
            <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-body)' }}>{pending.product_name}</p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="number" value={grams} onChange={e => setGrams(e.target.value)} min="1" style={{ width: 80, padding: '6px 8px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', background: 'var(--bg-card)', fontSize: 14, color: 'var(--text)', fontFamily: 'var(--font-body)', outline: 'none' }} />
              <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>g</span>
              <div style={{ flex: 1 }} />
              <button onClick={() => setPending(null)} style={{ padding: '6px 12px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-dim)', fontSize: 12, cursor: 'pointer' }}>{t('nutrition.common.back')}</button>
              <button onClick={handleConfirm} style={{ padding: '6px 14px', borderRadius: 'var(--r-sm)', border: 'none', background: 'linear-gradient(135deg,#06B6D4,#3B82F6)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>{t('nutrition.common.add')}</button>
            </div>
          </div>
        )}

        {/* Results */}
        {!pending && (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading && <Skeleton />}

            {!loading && showDefault && (
              <>
                {recentFoods.length > 0 && (
                  <>
                    <p style={{ padding: '4px 16px 6px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', margin: 0 }}>{t('nutrition.foodSearch.recent')}</p>
                    {recentFoods.map(f => <FoodRow key={f.code} food={f} onSelect={handleSelect} />)}
                    <div style={{ height: 1, background: 'var(--border)', margin: '4px 16px' }} />
                  </>
                )}
                <p style={{ padding: '4px 16px 6px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', margin: 0 }}>{t('nutrition.foodSearch.frequent')}</p>
                {COMMON_FOODS.map(f => <FoodRow key={f.code} food={f} onSelect={handleSelect} />)}
              </>
            )}

            {!loading && !showDefault && (
              <>
                {localResults.length > 0 && (
                  <>
                    <p style={{ padding: '4px 16px 6px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', margin: 0 }}>{t('nutrition.foodSearch.library')}</p>
                    {localResults.map(f => <FoodRow key={f.code} food={f} onSelect={handleSelect} />)}
                  </>
                )}
                {apiResults.length > 0 && (
                  <>
                    {localResults.length > 0 && <div style={{ height: 1, background: 'var(--border)', margin: '4px 16px' }} />}
                    <p style={{ padding: '4px 16px 6px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', margin: 0 }}>{t('nutrition.foodSearch.products')}</p>
                    {apiResults.map(f => <FoodRow key={f.code} food={f} onSelect={handleSelect} />)}
                  </>
                )}
                {showEmpty && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 24px', gap: 10 }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="1.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                    <p style={{ fontSize: 13, color: 'var(--text-dim)', textAlign: 'center', margin: 0, lineHeight: 1.5 }}>
                      {t('nutrition.foodSearch.notFound', { query })}<br/>
                      <span style={{ fontSize: 11 }}>{t('nutrition.foodSearch.tryAgain')}</span>
                    </p>
                    <button onClick={requestClose} style={{ padding: '8px 18px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-dim)', fontSize: 12, cursor: 'pointer', marginTop: 4 }}>{t('nutrition.foodSearch.manualEntry')}</button>
                  </div>
                )}
              </>
            )}
            <div style={{ height: 24 }} />
          </div>
        )}
      </div>
    </div>
  )
}
