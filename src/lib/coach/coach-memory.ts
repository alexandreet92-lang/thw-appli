// ══════════════════════════════════════════════════════════════
// Coach Memory — continuité entre les sessions.
//
// Le coach « central » repartait de zéro à chaque conversation. Ce
// module lui redonne une mémoire : il lit les conversations passées
// de l'athlète (stockées en JSONB dans public.ai_conversations) et
// en fabrique un digest compact — sujet + dernière prise de position
// du coach — injecté dans le system prompt. Le coach peut ainsi
// référencer ce qui a déjà été dit, sans tout réexpliquer.
//
// Budget-token maîtrisé : au plus quelques conversations, chacune
// résumée en 2 lignes, le tout plafonné. Lecture défensive : toute
// erreur renvoie une mémoire vide (jamais bloquant).
// ══════════════════════════════════════════════════════════════

interface ConvMsg { role?: string; content?: unknown }
interface ConvData {
  id?: string
  title?: string
  updatedAt?: number
  msgs?: ConvMsg[]
}
interface Row { data?: ConvData | null; updated_at?: string | null }

const MAX_CONVS = 6        // nombre de conversations passées résumées
const MAX_CHARS = 1600     // plafond global du bloc mémoire (~400 tokens)
const SNIPPET = 220        // longueur max d'un extrait

function text(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    // blocs Anthropic [{type:'text', text}]
    return content.map(b => (b && typeof b === 'object' && 'text' in b ? String((b as { text: unknown }).text) : '')).join(' ')
  }
  return ''
}
function clean(s: string): string {
  return s.replace(/```[\s\S]*?```/g, ' ').replace(/[#*>|`]/g, '').replace(/\s+/g, ' ').trim()
}
function clip(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s
}
function whenLabel(ts?: number, iso?: string | null): string {
  const t = ts ?? (iso ? new Date(iso).getTime() : 0)
  if (!t) return ''
  const days = Math.floor((Date.now() - t) / 86400000)
  if (days <= 0) return "aujourd'hui"
  if (days === 1) return 'hier'
  if (days < 7) return `il y a ${days}j`
  if (days < 30) return `il y a ${Math.floor(days / 7)} sem.`
  return `il y a ${Math.floor(days / 30)} mois`
}

export async function buildCoachMemory(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: any,
  userId: string,
  currentConvId?: string,
): Promise<string> {
  let rows: Row[] = []
  try {
    const { data, error } = await sb
      .from('ai_conversations')
      .select('data,updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(MAX_CONVS + 6)
    if (error || !data) return ''
    rows = data as Row[]
  } catch {
    return ''
  }

  const digests: string[] = []
  for (const r of rows) {
    const c = r.data
    if (!c || !Array.isArray(c.msgs)) continue
    if (currentConvId && c.id === currentConvId) continue        // pas la conversation en cours

    const userMsgs = c.msgs.filter(m => m.role === 'user')
    const asstMsgs = c.msgs.filter(m => m.role === 'assistant')
    if (userMsgs.length === 0) continue                          // conversation vide / sans échange

    const firstAsk = clip(clean(text(userMsgs[0]?.content)), SNIPPET)
    const lastReply = asstMsgs.length ? clip(clean(text(asstMsgs[asstMsgs.length - 1]?.content)), SNIPPET) : ''
    if (!firstAsk) continue

    const when = whenLabel(c.updatedAt, r.updated_at)
    const title = c.title ? clean(c.title) : ''
    const head = [title || 'Échange', when].filter(Boolean).join(' · ')
    const line = lastReply
      ? `• ${head} — demande : « ${firstAsk} » → conseil donné : ${lastReply}`
      : `• ${head} — demande : « ${firstAsk} »`
    digests.push(line)
    if (digests.length >= MAX_CONVS) break
  }

  if (!digests.length) return ''

  let body = digests.join('\n')
  if (body.length > MAX_CHARS) body = body.slice(0, MAX_CHARS - 1).trimEnd() + '…'

  return `========== MÉMOIRE — ÉCHANGES PRÉCÉDENTS (continuité, référence-toi si pertinent ; ne répète pas ce qui est déjà acquis) ==========
${body}
========== FIN MÉMOIRE ==========`
}
