'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'

export default function LoginPage() {
  const router = useRouter()
  const [mode,     setMode]     = useState<'login'|'signup'>('login')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string|null>(null)
  const [success,  setSuccess]  = useState<string|null>(null)

  async function handleSubmit() {
    setLoading(true)
    setError(null)
    setSuccess(null)

    const supabase = createClient()

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError('Email ou mot de passe incorrect.')
      } else {
        router.push('/profile')
        router.refresh()
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/profile` }
      })
      if (error) {
        setError(error.message)
      } else {
        setSuccess('Compte créé ! Vérifie ton email pour confirmer ton compte.')
      }
    }

    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      padding: 16,
    }}>
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 20,
        padding: 32,
        maxWidth: 400,
        width: '100%',
        boxShadow: 'var(--shadow-card)',
      }}>

        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:28 }}>
          <div style={{ width:40, height:40, borderRadius:12, background:'linear-gradient(135deg,#06B6D4,#5b6fff)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:12, color:'#fff', boxShadow:'0 0 16px rgba(6,182,212,0.3)' }}>
            THW
          </div>
          <div>
            <p style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:15, color:'var(--text)', margin:0, lineHeight:1.2 }}>THW Coaching</p>
            <p style={{ fontSize:11, color:'var(--text-dim)', margin:0 }}>Application de coaching sportif</p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:6, marginBottom:24, background:'var(--bg-card2)', borderRadius:10, padding:4 }}>
          {(['login','signup'] as const).map(m=>(
            <button
              key={m}
              onClick={()=>{ setMode(m); setError(null); setSuccess(null) }}
              style={{
                flex:1, padding:'8px', borderRadius:8, border:'none', cursor:'pointer',
                background: mode===m ? 'var(--bg-card)' : 'transparent',
                color: mode===m ? 'var(--text)' : 'var(--text-dim)',
                fontFamily:'Syne,sans-serif', fontSize:12, fontWeight:mode===m?700:400,
                boxShadow: mode===m ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                transition:'all 0.15s',
              }}>
              {m==='login' ? 'Se connecter' : 'Créer un compte'}
            </button>
          ))}
        </div>

        {/* Form */}
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div>
            <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.07em', color:'var(--text-dim)', marginBottom:6 }}>Email</p>
            <input
              type="email"
              value={email}
              onChange={e=>setEmail(e.target.value)}
              placeholder="ton@email.com"
              onKeyDown={e=>e.key==='Enter'&&handleSubmit()}
              style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontSize:13, outline:'none', fontFamily:'DM Sans,sans-serif' }}
            />
          </div>
          <div>
            <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.07em', color:'var(--text-dim)', marginBottom:6 }}>Mot de passe</p>
            <input
              type="password"
              value={password}
              onChange={e=>setPassword(e.target.value)}
              placeholder="••••••••"
              onKeyDown={e=>e.key==='Enter'&&handleSubmit()}
              style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontSize:13, outline:'none', fontFamily:'DM Sans,sans-serif' }}
            />
          </div>

          {error && (
            <div style={{ padding:'9px 12px', borderRadius:9, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', color:'#ef4444', fontSize:12 }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{ padding:'9px 12px', borderRadius:9, background:'rgba(34,197,94,0.08)', border:'1px solid rgba(34,197,94,0.2)', color:'#22c55e', fontSize:12 }}>
              {success}
            </div>
          )}

          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={loading || !email || !password}
            loading={loading}
            style={{ width: '100%', marginTop: 4, justifyContent: 'center' }}
          >
            {mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
          </Button>

          <div style={{ display:'flex', alignItems:'center', gap:8, margin:'4px 0' }}>
            <div style={{ flex:1, height:1, background:'var(--border)' }} />
            <span style={{ fontSize:11, color:'var(--text-dim)' }}>ou</span>
            <div style={{ flex:1, height:1, background:'var(--border)' }} />
          </div>

          <button
            onClick={async () => {
              setLoading(true)
              setError(null)
              const supabase = createClient()
              const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: window.location.origin + '/auth/callback' },
              })
              if (error) { setError(error.message); setLoading(false) }
            }}
            disabled={loading}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)',
              background: 'var(--bg-card2)', color: 'var(--text)', fontSize: 13,
              fontFamily: 'DM Sans,sans-serif', cursor: 'pointer', fontWeight: 500,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#4285F4" d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.5 0 20-7.6 20-21 0-1.3-.2-2.7-.5-4z"/>
              <path fill="#34A853" d="M6.3 14.7l7 5.1C15.1 16.2 19.2 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 5.1 29.6 3 24 3 16.3 3 9.7 7.9 6.3 14.7z"/>
              <path fill="#FBBC05" d="M24 45c5.5 0 10.5-1.8 14.4-5l-6.6-5.4C29.8 36.2 27 37 24 37c-6 0-10.6-3.1-11.8-7.4l-7 5.4C8.9 42 16 45 24 45z"/>
              <path fill="#EA4335" d="M44.5 20H24v8.5h11.8c-.8 2.4-2.4 4.4-4.5 5.8l6.6 5.4C42.4 36 45 30.5 45 24c0-1.3-.2-2.7-.5-4z"/>
            </svg>
            Continuer avec Google
          </button>

          {mode==='login' && (
            <button
              onClick={async()=>{
                if (!email) { setError('Entre ton email d\'abord.'); return }
                setLoading(true)
                const supabase = createClient()
                const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo:`${window.location.origin}/auth/callback?next=/auth/update-password` })
                setLoading(false)
                if (error) setError(error.message)
                else setSuccess('Email de réinitialisation envoyé !')
              }}
              style={{ background:'none', border:'none', color:'var(--text-dim)', fontSize:11, cursor:'pointer', textDecoration:'underline', padding:0, textAlign:'center' as const }}>
              Mot de passe oublié ?
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
