// Messages utilisateurs → créateur (table user_feedback). SERVEUR UNIQUEMENT
// (service role, bypass RLS). Ré-vérifie l'identité admin avant toute requête.
import 'server-only'
import { createServiceClient } from '@/lib/supabase/server'
import { checkAdmin } from './guard'

export interface FeedbackRow {
  id: string
  user_email: string | null
  category: 'amelioration' | 'bug' | 'jaime' | 'autre'
  message: string
  page: string | null
  resolved: boolean
  created_at: string
}

export async function getUserFeedback(limit = 200): Promise<FeedbackRow[]> {
  const chk = await checkAdmin()
  if (!chk.ok) throw new Error('FORBIDDEN')
  const sb = createServiceClient()
  const { data } = await sb.from('user_feedback')
    .select('id, user_email, category, message, page, resolved, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data ?? []) as FeedbackRow[]
}
