// Helpers du journal alimentaire : dérivation des aliments d'un créneau + upload photo.
// Aucune migration : les macros par aliment vivent dans la colonne jsonb `ingredients`.
import { createClient } from '@/lib/supabase/client'
import type { DailyMealEntry } from '@/hooks/useDailyMeals'
import type { EditableFood } from './FoodEditSheet'

// Aliments d'un créneau : depuis le jsonb `ingredients` (macros incluses) ; sinon, pour les
// entrées héritées sans détail, un aliment agrégé synthétique reste éditable.
export function foodsOf(e?: DailyMealEntry): EditableFood[] {
  if (!e) return []
  const ing = e.ingredients ?? []
  const detailed = ing.some(i => i.kcal != null || i.prot != null || i.gluc != null || i.lip != null)
  if (detailed) {
    return ing.map(i => ({ name: i.name, qty: i.qty ?? '', unit: i.unit ?? '', kcal: i.kcal ?? 0, prot: i.prot ?? 0, gluc: i.gluc ?? 0, lip: i.lip ?? 0 }))
  }
  if ((e.actual_kcal ?? 0) > 0) {
    return [{ name: e.meal_name ?? 'Repas', qty: '', unit: '', kcal: e.actual_kcal ?? 0, prot: e.actual_prot ?? 0, gluc: e.actual_gluc ?? 0, lip: e.actual_lip ?? 0 }]
  }
  return []
}

export async function uploadPhoto(file: File): Promise<string | null> {
  try {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return null
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${user.id}/${Date.now()}.${ext}`
    const { error } = await sb.storage.from('meal-photos').upload(path, file)
    if (error) return null
    return sb.storage.from('meal-photos').getPublicUrl(path).data.publicUrl
  } catch { return null }
}
