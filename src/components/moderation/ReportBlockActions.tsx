'use client'
// ══════════════════════════════════════════════════════════════════════════
// Actions de modération réutilisables sur un message/utilisateur d'une
// messagerie privée : « Signaler » (avec motif) et « Bloquer » (avec confirmation).
// Exigence Apple (Guideline 1.2). Rendu :
//   • ReportBlockMenuItems : deux <button> à insérer dans un menu existant
//     (héritent du style passé). Ouvre les dialogues internes.
//   • Les dialogues (motif de signalement / confirmation de blocage) sont
//     rendus en overlay plein écran.
// ══════════════════════════════════════════════════════════════════════════
import { useState } from 'react'
import { blockUser, reportUserOrMessage, type ReportContext } from '@/lib/moderation/dm'

const REPORT_REASONS = [
  'Contenu inapproprié ou offensant',
  'Harcèlement ou intimidation',
  'Spam ou arnaque',
  'Nudité ou contenu sexuel',
  'Usurpation d’identité',
  'Autre',
]

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 2147483000,
  background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center',
  justifyContent: 'center', padding: 20,
}
const card: React.CSSProperties = {
  width: '100%', maxWidth: 380, background: 'var(--bg-card)', borderRadius: 18,
  border: '1px solid var(--border)', boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
  padding: 20, display: 'flex', flexDirection: 'column', gap: 12,
}

export function ReportBlockActions({
  targetUserId, targetName, context, messageId, messageExcerpt, itemStyle, onBlocked, onClose,
}: {
  targetUserId: string
  targetName?: string
  context: ReportContext
  messageId?: string | null
  messageExcerpt?: string | null
  itemStyle: React.CSSProperties
  onBlocked?: () => void
  onClose?: () => void
}) {
  const [dialog, setDialog] = useState<null | 'report' | 'block'>(null)
  const [reason, setReason] = useState(REPORT_REASONS[0])
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<null | 'report' | 'block'>(null)

  const who = targetName?.trim() || 'cet utilisateur'

  async function submitReport() {
    setBusy(true)
    const full = reason === 'Autre' && note.trim() ? note.trim() : note.trim() ? `${reason} — ${note.trim()}` : reason
    const ok = await reportUserOrMessage({
      reportedUserId: targetUserId, context, messageId, messageExcerpt, reason: full,
    })
    setBusy(false)
    if (ok) { setDone('report'); setDialog(null) }
  }

  async function confirmBlock() {
    setBusy(true)
    const ok = await blockUser(targetUserId)
    setBusy(false)
    if (ok) { setDone('block'); setDialog(null); onBlocked?.() }
  }

  return (
    <>
      <button
        onClick={e => { e.stopPropagation(); setDialog('report') }}
        style={{ ...itemStyle, color: 'var(--text)' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
        Signaler
      </button>
      <button
        onClick={e => { e.stopPropagation(); setDialog('block') }}
        style={{ ...itemStyle, borderTop: '1px solid var(--border)', color: '#EF4444' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.9" y1="4.9" x2="19.1" y2="19.1"/></svg>
        Bloquer
      </button>

      {dialog === 'report' && (
        <div style={overlay} onClick={e => { e.stopPropagation(); setDialog(null); onClose?.() }}>
          <div style={card} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Signaler {who}</h3>
            <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.4 }}>
              Nous examinons chaque signalement sous 24 h et prenons les mesures nécessaires (avertissement, suppression, suspension).
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {REPORT_REASONS.map(r => (
                <label key={r} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13.5, color: 'var(--text)', cursor: 'pointer', padding: '3px 0' }}>
                  <input type="radio" name="dm-report-reason" checked={reason === r} onChange={() => setReason(r)} style={{ accentColor: 'var(--primary)' }} />
                  {r}
                </label>
              ))}
            </div>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
              placeholder="Détails (facultatif)…"
              style={{ resize: 'none', padding: '9px 12px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-alt)', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font-body)', outline: 'none' }} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
              <button onClick={() => { setDialog(null); onClose?.() }} style={{ fontSize: 13, padding: '8px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-mid)', cursor: 'pointer' }}>Annuler</button>
              <button onClick={() => void submitReport()} disabled={busy} style={{ fontSize: 13, padding: '8px 16px', borderRadius: 10, border: 'none', background: 'var(--primary)', color: 'var(--on-primary)', cursor: busy ? 'default' : 'pointer', fontWeight: 700, opacity: busy ? 0.6 : 1 }}>{busy ? 'Envoi…' : 'Envoyer'}</button>
            </div>
          </div>
        </div>
      )}

      {dialog === 'block' && (
        <div style={overlay} onClick={e => { e.stopPropagation(); setDialog(null); onClose?.() }}>
          <div style={card} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Bloquer {who} ?</h3>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.45 }}>
              Vous ne pourrez plus vous envoyer de messages. Vous pourrez le débloquer à tout moment depuis les réglages.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
              <button onClick={() => { setDialog(null); onClose?.() }} style={{ fontSize: 13, padding: '8px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-mid)', cursor: 'pointer' }}>Annuler</button>
              <button onClick={() => void confirmBlock()} disabled={busy} style={{ fontSize: 13, padding: '8px 16px', borderRadius: 10, border: 'none', background: '#EF4444', color: '#fff', cursor: busy ? 'default' : 'pointer', fontWeight: 700, opacity: busy ? 0.6 : 1 }}>{busy ? '…' : 'Bloquer'}</button>
            </div>
          </div>
        </div>
      )}

      {done && (
        <div style={overlay} onClick={e => { e.stopPropagation(); setDone(null); onClose?.() }}>
          <div style={card} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 34, height: 34, borderRadius: '50%', background: 'color-mix(in srgb, var(--primary) 16%, transparent)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
              </span>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--text)', fontWeight: 600 }}>
                {done === 'report' ? 'Signalement envoyé. Merci.' : `${who} a été bloqué.`}
              </p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => { setDone(null); onClose?.() }} style={{ fontSize: 13, padding: '8px 16px', borderRadius: 10, border: 'none', background: 'var(--primary)', color: 'var(--on-primary)', cursor: 'pointer', fontWeight: 700 }}>OK</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
