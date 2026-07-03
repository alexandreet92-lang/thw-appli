'use client'

// ══════════════════════════════════════════════════════════════════
// PlanShoppingList — liste de courses dérivée des repas RÉELS du plan.
// Bascule Par jour / Semaine complète, regroupement par rayon, quantités
// en fourchette (best-effort, cf. limite documentée), impression / PDF.
// NB : les repas du plan sont des DESCRIPTIONS en texte libre → extraction
// best-effort (pas de quantités en grammes fiables). Documenté dans le .md.
// ══════════════════════════════════════════════════════════════════

import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { NutritionPlanData, MealSet, MealSlotValue } from '@/hooks/useNutrition'
import { slotText } from '@/hooks/useNutrition'
import { useI18n } from '@/lib/i18n'

// Mapping libellé de rayon (identifiant interne) → clé i18n d'affichage.
const RAYON_I18N: Record<string, string> = {
  'Fruits & légumes': 'nutrition.rayon.produce',
  'Protéines': 'nutrition.rayon.proteins',
  'Féculents & épicerie': 'nutrition.rayon.grocery',
  'Produits laitiers': 'nutrition.rayon.dairy',
  'Fruits secs & autres': 'nutrition.rayon.nuts',
  'Autres': 'nutrition.rayon.other',
}

interface Props {
  plan:      NutritionPlanData
  variant:   'A' | 'B'
  selectedDate?: string | null
  isDesktop: boolean
  onClose:   () => void
}

const SLOT_KEYS: (keyof MealSet)[] = ['petit_dejeuner', 'collation_matin', 'dejeuner', 'collation_apres_midi', 'diner', 'collation_soir']

// Rayons (mots-clés minuscules sans accent) — ordre = ordre d'affichage.
const RAYONS: { label: string; keys: string[] }[] = [
  { label: 'Fruits & légumes', keys: ['legume', 'salade', 'tomate', 'brocoli', 'epinard', 'carotte', 'courgette', 'avocat', 'fruit', 'pomme', 'banane', 'poivron', 'oignon', 'champignon', 'concombre', 'haricot vert', 'patate douce'] },
  { label: 'Protéines',        keys: ['poulet', 'boeuf', 'steak', 'oeuf', 'œuf', 'poisson', 'saumon', 'thon', 'dinde', 'jambon', 'tofu', 'viande', 'cabillaud', 'crevette', 'whey', 'proteine'] },
  { label: 'Féculents & épicerie', keys: ['riz', 'pate', 'pâte', 'pain', 'avoine', 'flocon', 'quinoa', 'semoule', 'lentille', 'pois chiche', 'haricot', 'patate', 'pomme de terre', 'miel', 'huile', 'farine', 'cereale'] },
  { label: 'Produits laitiers', keys: ['yaourt', 'fromage', 'lait', 'skyr', 'cottage', 'beurre', 'creme'] },
  { label: 'Fruits secs & autres', keys: ['amande', 'noix', 'noisette', 'cajou', 'graine', 'beurre de cacahuete'] },
]

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

function rayonOf(token: string): string {
  const n = normalize(token)
  for (const r of RAYONS) if (r.keys.some(k => n.includes(k))) return r.label
  return 'Autres'
}

// Extrait des « ingrédients » d'une description libre : découpe sur séparateurs.
function extractTokens(desc: string): string[] {
  return desc
    .split(/[,;+/\n]|\bavec\b|\bet\b|\bplus\b/i)
    .map(t => t.replace(/\d+\s*(g|gr|grammes?|ml|cl|kcal|x)\b/gi, '').replace(/[()[\]]/g, '').trim())
    .filter(t => t.length >= 3 && t.length <= 40)
}

export function PlanShoppingList({ plan, variant, selectedDate, isDesktop, onClose }: Props) {
  const { t } = useI18n()
  const [scope, setScope] = useState<'day' | 'week'>(selectedDate ? 'day' : 'week')

  const grouped = useMemo(() => {
    const days = (plan.jours ?? []).filter(j => scope === 'week' || j.date === selectedDate)
    const counts = new Map<string, { label: string; rayon: string; n: number }>()
    for (const day of days) {
      const set = variant === 'A' ? day.repas?.option_A : day.repas?.option_B
      if (!set) continue
      for (const k of SLOT_KEYS) {
        const v = set[k] as MealSlotValue | undefined
        if (v == null) continue
        for (const tok of extractTokens(slotText(v))) {
          const key = normalize(tok)
          const prev = counts.get(key)
          if (prev) prev.n += 1
          else counts.set(key, { label: tok.charAt(0).toUpperCase() + tok.slice(1), rayon: rayonOf(tok), n: 1 })
        }
      }
    }
    const byRayon = new Map<string, { label: string; n: number }[]>()
    for (const it of counts.values()) {
      const arr = byRayon.get(it.rayon) ?? []
      arr.push({ label: it.label, n: it.n })
      byRayon.set(it.rayon, arr)
    }
    const order = [...RAYONS.map(r => r.label), 'Autres']
    return order
      .filter(r => byRayon.has(r))
      .map(r => ({ rayon: r, items: (byRayon.get(r) ?? []).sort((a, b) => b.n - a.n) }))
  }, [plan.jours, variant, scope, selectedDate])

  const isEmpty = grouped.length === 0

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 2100, background: 'rgba(0,0,0,0.62)', display: 'flex', alignItems: isDesktop ? 'center' : 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <style>{`@media print { body * { visibility: hidden; } #shopping-print, #shopping-print * { visibility: visible; } #shopping-print { position: absolute; inset: 0; } }`}</style>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 560, background: 'var(--bg-card)', borderRadius: isDesktop ? 16 : '16px 16px 0 0', padding: 22, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: 17, color: 'var(--text)', margin: 0 }}>{t('nutrition.plan.shoppingList')}</h3>
          <button onClick={onClose} aria-label={t('nutrition.common.close')} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text)', cursor: 'pointer' }}>×</button>
        </div>

        {/* Bascule Par jour / Semaine */}
        <div style={{ display: 'inline-flex', gap: 2, padding: 3, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-card2)', marginBottom: 14 }}>
          {([['day', t('nutrition.shopping.perDay')], ['week', t('nutrition.shopping.fullWeek')]] as const).map(([id, lbl]) => (
            <button key={id} onClick={() => setScope(id)} disabled={id === 'day' && !selectedDate}
              style={{ padding: '6px 12px', borderRadius: 6, border: 'none', cursor: id === 'day' && !selectedDate ? 'not-allowed' : 'pointer',
                fontSize: 12, fontWeight: scope === id ? 700 : 500, fontFamily: 'DM Sans,sans-serif',
                background: scope === id ? 'var(--bg-card)' : 'transparent', color: scope === id ? 'var(--text)' : 'var(--text-dim)', opacity: id === 'day' && !selectedDate ? 0.4 : 1 }}>
              {lbl}
            </button>
          ))}
        </div>

        <div id="shopping-print">
          {isEmpty ? (
            <p style={{ fontSize: 13, color: 'var(--text-dim)', padding: '16px 0' }}>{t('nutrition.shopping.empty')}</p>
          ) : grouped.map(g => (
            <div key={g.rayon} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', marginBottom: 6 }}>{t(RAYON_I18N[g.rayon] ?? 'nutrition.rayon.other')}</div>
              {g.items.map(it => (
                <div key={it.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '0.5px solid var(--border)', fontSize: 13, color: 'var(--text)' }}>
                  <span>{it.label}</span>
                  <span style={{ color: 'var(--text-dim)', fontFamily: 'DM Mono,monospace', fontSize: 12 }}>{it.n}–{it.n + 1}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {!isEmpty && (
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={() => window.print()} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text)', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>{t('nutrition.shopping.print')}</button>
            <button onClick={() => window.print()} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text)', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>{t('nutrition.shopping.downloadPdf')}</button>
          </div>
        )}
        <p style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 10, lineHeight: 1.4 }}>
          {t('nutrition.shopping.footnote')}
        </p>
      </div>
    </div>,
    document.body,
  )
}
