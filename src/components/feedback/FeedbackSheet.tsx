'use client'
// Bottom sheet « Envoyer un message au créateur » : l'utilisateur choisit une
// catégorie (amélioration, bug, ce qu'il aime, autre) et écrit sa remarque. Le
// message est enregistré dans user_feedback → lu par le créateur dans le Cockpit.
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { IconBulb, IconBug, IconHeart, IconDots, IconCheck, IconSend } from '@tabler/icons-react'
import { createClient } from '@/lib/supabase/client'
import { BottomSheet } from '@/components/ui/BottomSheet'

const FB = 'var(--font-body)', FD = 'var(--font-display)'
type Cat = 'amelioration' | 'bug' | 'jaime' | 'autre'
const CATS: { id: Cat; label: string; Icon: typeof IconBulb; color: string }[] = [
  { id: 'amelioration', label: 'Amélioration', Icon: IconBulb,  color: '#06B6D4' },
  { id: 'bug',          label: 'Bug / problème', Icon: IconBug,  color: '#ef4444' },
  { id: 'jaime',        label: "Ce que j'aime", Icon: IconHeart, color: '#22c55e' },
  { id: 'autre',        label: 'Autre',        Icon: IconDots,  color: '#8b5cf6' },
]

export function FeedbackSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname()
  const [cat, setCat] = useState<Cat>('amelioration')
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  function close() { setDone(false); setMsg(''); setCat('amelioration'); setErr(null); onClose() }

  async function submit() {
    if (!msg.trim()) return
    setSaving(true); setErr(null)
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { setErr('Tu dois être connecté pour envoyer un message.'); setSaving(false); return }
      const { error } = await sb.from('user_feedback').insert({
        user_id: user.id, user_email: user.email ?? null,
        category: cat, message: msg.trim(), page: pathname ?? null,
      })
      if (error) { setErr(error.message || "Envoi impossible. Réessaie."); setSaving(false); return }
      setDone(true); setSaving(false)
      setTimeout(close, 1400)
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Envoi impossible. Réessaie."); setSaving(false)
    }
  }

  return (
    <BottomSheet isOpen={open} onClose={close} title="Envoyer un message">
      {done ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 'var(--space-6) 0' }}>
          <span style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--primary-dim)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconCheck size={30} /></span>
          <p style={{ fontFamily: FD, fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Message envoyé · merci !</p>
        </div>
      ) : (
        <div style={{ paddingBottom: 8 }}>
          <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)', margin: '0 0 var(--space-5)', lineHeight: 1.45 }}>
            Une idée d'amélioration, un bug, ou juste ce que tu aimes ? Écris-moi, je lis tout.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 'var(--space-5)' }}>
            {CATS.map(c => {
              const on = cat === c.id
              return (
                <button key={c.id} onClick={() => setCat(c.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '11px 12px', borderRadius: 12, cursor: 'pointer',
                  border: `1.5px solid ${on ? c.color : 'var(--border)'}`, background: on ? `${c.color}14` : 'var(--bg-card2)',
                  color: on ? c.color : 'var(--text-mid)', fontFamily: FB, fontSize: 12.5, fontWeight: 600, textAlign: 'left' }}>
                  <c.Icon size={17} /> {c.label}
                </button>
              )
            })}
          </div>
          <textarea value={msg} onChange={e => setMsg(e.target.value)} rows={5} placeholder="Ton message…"
            style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 12, border: '1px solid var(--border)',
              background: 'var(--bg-card2)', color: 'var(--text)', fontFamily: FB, fontSize: 14, outline: 'none', resize: 'vertical', marginBottom: 'var(--space-3)' }} />
          {err && <p style={{ fontFamily: FB, fontSize: 12.5, color: '#ef4444', margin: '0 0 var(--space-3)' }}>{err}</p>}
          <button onClick={submit} disabled={saving || !msg.trim()} style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '14px 16px', borderRadius: 14, border: 'none', cursor: saving || !msg.trim() ? 'default' : 'pointer',
            background: 'var(--primary)', color: 'var(--on-primary, #fff)', fontFamily: FB, fontSize: 14.5, fontWeight: 700,
            opacity: saving || !msg.trim() ? 0.55 : 1, boxShadow: '0 4px 14px color-mix(in srgb, var(--primary) 35%, transparent)' }}>
            <IconSend size={17} /> {saving ? 'Envoi…' : 'Envoyer'}
          </button>
        </div>
      )}
    </BottomSheet>
  )
}
