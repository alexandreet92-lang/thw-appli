'use client'
// Bottom sheet « Envoyer un message au créateur » : l'utilisateur choisit une
// catégorie (amélioration, bug, ce qu'il aime, autre) et écrit sa remarque. Le
// message est enregistré dans user_feedback → lu par le créateur dans le Cockpit.
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { IconBulb, IconBug, IconHeart, IconDots, IconCheck, IconSend } from '@tabler/icons-react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/currentUser'
import { BottomSheet, SheetCard, SheetPill, SHEET_CARD_SHADOW, useMobileSafe } from '@/components/ui/BottomSheet'
import { useI18n } from '@/lib/i18n'

const FB = 'var(--font-body)', FD = 'var(--font-display)'
type Cat = 'amelioration' | 'bug' | 'jaime' | 'autre'
const CATS: { id: Cat; label: string; Icon: typeof IconBulb; color: string }[] = [
  { id: 'amelioration', label: 'Amélioration', Icon: IconBulb,  color: '#06B6D4' }, // design-allow-color — teinte de catégorie (icône)
  { id: 'bug',          label: 'Bug / problème', Icon: IconBug,  color: '#ef4444' }, // design-allow-color — teinte de catégorie (icône)
  { id: 'jaime',        label: "Ce que j'aime", Icon: IconHeart, color: '#22c55e' }, // design-allow-color — teinte de catégorie (icône)
  { id: 'autre',        label: 'Autre',        Icon: IconDots,  color: '#8b5cf6' }, // design-allow-color — teinte de catégorie (icône)
]

export function FeedbackSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n()
  const pathname = usePathname()
  const [cat, setCat] = useState<Cat>('amelioration')
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const mobile = useMobileSafe()

  function close() { setDone(false); setMsg(''); setCat('amelioration'); setErr(null); onClose() }

  async function submit() {
    if (!msg.trim()) return
    setSaving(true); setErr(null)
    try {
      const sb = createClient()
      const user = await getCurrentUser()
      if (!user) { setErr(t('w3h.fb_must_login')); setSaving(false); return }
      const { error } = await sb.from('user_feedback').insert({
        user_id: user.id, user_email: user.email ?? null,
        category: cat, message: msg.trim(), page: pathname ?? null,
      })
      if (error) { setErr(error.message || t('w3h.fb_send_failed')); setSaving(false); return }
      setDone(true); setSaving(false)
      setTimeout(close, 1400)
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('w3h.fb_send_failed')); setSaving(false)
    }
  }

  // Mobile (≤ 767 px) : cartes blanches sur fond gris chaud, puces pilule,
  // champ plein sans bordure, bouton pilule cyan. Desktop : rendu historique.
  if (mobile) {
    const disabled = saving || !msg.trim()
    return (
      <BottomSheet isOpen={open} onClose={close} title={t('w3h.fb_title')}>
        {done ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 'var(--space-8) 0' }}>
            <span style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--surface-card)', boxShadow: SHEET_CARD_SHADOW, color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconCheck size={30} /></span>
            <p style={{ fontFamily: FB, fontSize: 19, fontWeight: 800, color: 'var(--text)', margin: 0 }}>{t('w3h.fb_sent')}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', fontFamily: FB }}>
            <p style={{ fontSize: 15, color: 'var(--text-mid)', margin: 0, lineHeight: 1.45, textAlign: 'center' }}>{t('w3h.fb_intro')}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {CATS.map(c => {
                const on = cat === c.id
                return (
                  <button key={c.id} type="button" onClick={() => setCat(c.id)} aria-pressed={on} style={{
                    display: 'flex', alignItems: 'center', gap: 8, minHeight: 48, padding: '0 14px', borderRadius: 'var(--r-pill)', cursor: 'pointer', border: 'none',
                    background: on ? 'var(--text)' : 'var(--surface-card)', color: on ? 'var(--bg)' : 'var(--text)', boxShadow: on ? 'none' : SHEET_CARD_SHADOW,
                    fontFamily: FB, fontSize: 14, fontWeight: 600, textAlign: 'left', transition: 'background 0.2s ease, color 0.2s ease' }}>
                    <span style={{ display: 'flex', color: on ? 'var(--bg)' : c.color, flexShrink: 0 }}><c.Icon size={18} /></span>
                    <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t(`w3h.fbcat_${c.id}`)}</span>
                  </button>
                )
              })}
            </div>
            <SheetCard>
              <textarea value={msg} onChange={e => setMsg(e.target.value)} rows={5} placeholder={t('w3h.fb_placeholder')}
                style={{ display: 'block', width: '100%', boxSizing: 'border-box', minHeight: 132, padding: '14px 16px', border: 'none',
                  background: 'transparent', color: 'var(--text)', fontFamily: FB, fontSize: 16, lineHeight: 1.45, outline: 'none', resize: 'none' }} />
            </SheetCard>
            {err && <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--danger)', margin: 0, textAlign: 'center' }}>{err}</p>}
            <SheetPill onClick={() => void submit()} disabled={disabled}>
              <IconSend size={18} /> {saving ? t('w3h.fb_sending') : t('w3h.fb_send')}
            </SheetPill>
          </div>
        )}
      </BottomSheet>
    )
  }

  return (
    <BottomSheet isOpen={open} onClose={close} title={t('w3h.fb_title')}>
      {done ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 'var(--space-6) 0' }}>
          <span style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--primary-dim)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconCheck size={30} /></span>
          <p style={{ fontFamily: FD, fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{t('w3h.fb_sent')}</p>
        </div>
      ) : (
        <div style={{ paddingBottom: 8 }}>
          <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)', margin: '0 0 var(--space-5)', lineHeight: 1.45 }}>
            {t('w3h.fb_intro')}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 'var(--space-5)' }}>
            {CATS.map(c => {
              const on = cat === c.id
              return (
                <button key={c.id} onClick={() => setCat(c.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '11px 12px', borderRadius: 'var(--r-md)', cursor: 'pointer',
                  border: `1.5px solid ${on ? c.color : 'var(--border)'}`, background: on ? `${c.color}14` : 'var(--bg-card2)',
                  color: on ? c.color : 'var(--text-mid)', fontFamily: FB, fontSize: 12.5, fontWeight: 600, textAlign: 'left' }}>
                  <c.Icon size={17} /> {t(`w3h.fbcat_${c.id}`)}
                </button>
              )
            })}
          </div>
          <textarea value={msg} onChange={e => setMsg(e.target.value)} rows={5} placeholder={t('w3h.fb_placeholder')}
            style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)',
              background: 'var(--bg-card2)', color: 'var(--text)', fontFamily: FB, fontSize: 14, outline: 'none', resize: 'vertical', marginBottom: 'var(--space-3)' }} />
          {err && <p style={{ fontFamily: FB, fontSize: 12.5, color: 'var(--danger)', margin: '0 0 var(--space-3)' }}>{err}</p>}
          <button onClick={submit} disabled={saving || !msg.trim()} style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '14px 16px', borderRadius: 'var(--r-md)', border: 'none', cursor: saving || !msg.trim() ? 'default' : 'pointer',
            background: 'var(--primary)', color: 'var(--on-primary, #fff)', fontFamily: FB, fontSize: 14.5, fontWeight: 700,
            opacity: saving || !msg.trim() ? 0.55 : 1, boxShadow: '0 4px 14px color-mix(in srgb, var(--primary) 35%, transparent)' }}>
            <IconSend size={17} /> {saving ? t('w3h.fb_sending') : t('w3h.fb_send')}
          </button>
        </div>
      )}
    </BottomSheet>
  )
}
