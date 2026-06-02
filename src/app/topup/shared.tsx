'use client'

// ══════════════════════════════════════════════════════════════
// /topup — éléments partagés (design Claude Design adapté au thème
// THW : variables CSS du projet + cyan #06B6D4). Jour/nuit OK.
// ══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import {
  MessageCircle, Activity, Calendar, Sunrise, ArrowRight, Receipt, Shield,
} from 'lucide-react'

export const APP_URL = '/'
export const GRAD = 'linear-gradient(135deg, #06B6D4, #5b6fff)'
export const GRAD_H = 'linear-gradient(90deg, #06B6D4, #5b6fff)'
export const fmt = (n: number) => n.toLocaleString('fr-FR')

// ── Packs (cohérents avec /api/topup/create-checkout) ──
export interface Pack {
  id: string; name: string; tokens: number; tokensLabel: string
  price: number; vol: number; per: string | null; save?: string
  desc: string; featured: boolean; accent: string
}
export const PACKS: Pack[] = [
  { id: 'discovery',   name: 'Découverte',  tokens: 100000,   tokensLabel: '100 000',   price: 4,  vol: 0.10, per: null,          desc: "Quelques jours d'usage intensif.", featured: false, accent: '#06B6D4' },
  { id: 'performance', name: 'Performance', tokens: 500000,   tokensLabel: '500 000',   price: 15, vol: 0.50, per: '3 €/100k',    save: '−25%', desc: "Le meilleur rapport pour tenir tout le mois.", featured: true,  accent: '#06B6D4' },
  { id: 'elite',       name: 'Elite',       tokens: 1000000,  tokensLabel: '1 000 000', price: 25, vol: 1.0,  per: '2,50 €/100k', save: '−37%', desc: "Pour un usage prolongé, sans compromis.", featured: false, accent: '#5b6fff' },
]

// Estimations pondérées par modèle (× multiplicateur : Hermès ×1, Athéna ×3, Zeus ×8)
export const USAGES = [
  { Ic: MessageCircle, title: 'Question à Hermès',        amt: '≈ 3 000',  desc: 'Conseils rapides, échanges courts (×1).', c: '#16A34A' },
  { Ic: Activity,      title: 'Analyse de séance · Athéna', amt: '≈ 12 000', desc: '4 000 réels × 3 — lecture + interprétation détaillée.', c: '#06B6D4' },
  { Ic: Calendar,      title: "Plan d'entraînement · Zeus", amt: '≈ 64 000', desc: '8 000 réels × 8 — programme structuré sur plusieurs semaines.', c: '#A855F7' },
  { Ic: Sunrise,       title: 'Briefing matinal · Athéna',  amt: '≈ 15 000', desc: 'Avec recherche web et données du jour (×3).', c: '#f59e0b' },
]

// ── Count-up (avec filet de sécurité) ──
export function useCountUp(target: number, opts: { duration?: number; delay?: number; run?: boolean } = {}): number {
  const { duration = 1300, delay = 200, run = true } = opts
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!run) { setVal(target); return }
    let raf = 0, t0 = 0
    const tick = (t: number) => {
      if (!t0) t0 = t
      const p = Math.min(1, (t - t0) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(target * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    const to = setTimeout(() => { raf = requestAnimationFrame(tick) }, delay)
    const safety = setTimeout(() => setVal(target), delay + duration + 300)
    return () => { clearTimeout(to); clearTimeout(safety); cancelAnimationFrame(raf) }
  }, [target, run, duration, delay])
  return val
}

// ── Jauge radiale ──
export function TokenGauge({ value, total, size = 248, label, sub, run = true, delayFill = 200 }: {
  value: number; total: number; size?: number; label: string; sub: string; run?: boolean; delayFill?: number
}) {
  const stroke = 14
  const r = size / 2 - stroke
  const circ = 2 * Math.PI * r
  const pct = total > 0 ? Math.min(1, value / total) : 0
  const [off, setOff] = useState(circ)
  const shown = useCountUp(value, { duration: 1400, delay: delayFill, run })

  useEffect(() => {
    if (!run) { setOff(circ * (1 - pct)); return }
    const to = setTimeout(() => setOff(circ * (1 - pct)), delayFill)
    return () => clearTimeout(to)
  }, [pct, circ, run, delayFill])

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <div style={{ position: 'absolute', inset: '-18%', zIndex: 0, background: 'radial-gradient(circle at 50% 50%, rgba(6,182,212,0.22), rgba(91,111,255,0.10) 45%, transparent 70%)', filter: 'blur(26px)' }} />
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: 'relative', zIndex: 1, transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border-mid)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#gaugeGrad)" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={off}
          style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.34,1,0.5,1)', filter: 'drop-shadow(0 0 8px rgba(6,182,212,0.45))' }} />
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06B6D4" /><stop offset="100%" stopColor="#5b6fff" />
          </linearGradient>
        </defs>
      </svg>
      <div style={{ position: 'absolute', inset: 0, zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 500, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 6 }}>{label}</div>
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 46, fontWeight: 800, letterSpacing: '-0.045em', lineHeight: 0.95, color: 'var(--text)' }}>{fmt(shown)}</div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}>{sub}</div>
      </div>
    </div>
  )
}

export function Header() {
  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 30, borderBottom: '1px solid var(--border)', background: 'var(--nav-bg)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
      <div className="topup-wrap" style={{ paddingTop: 13, paddingBottom: 13, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href={APP_URL} style={{ display: 'flex', alignItems: 'center', gap: 11, color: 'var(--text)', textDecoration: 'none' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Hybrid Training" style={{ width: 32, height: 32, borderRadius: 9 }} />
          <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em' }}>Hybrid Training</span>
        </a>
        <a href={APP_URL} className="topup-back" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border-mid)', color: 'var(--text-mid)', fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
          <span className="hdr-back-txt">Retour à l&apos;app</span>
          <ArrowRight size={14} />
        </a>
      </div>
    </header>
  )
}

export function Footer() {
  return (
    <footer style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-alt)' }}>
      <div className="topup-wrap" style={{ paddingTop: 30, paddingBottom: 34, textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 22, flexWrap: 'wrap', marginBottom: 18 }}>
          <a href="#" style={{ fontSize: 12.5, color: 'var(--text-mid)', textDecoration: 'none' }}>Conditions de vente</a>
          <a href="#" style={{ fontSize: 12.5, color: 'var(--text-mid)', textDecoration: 'none' }}>FAQ</a>
          <a href="mailto:support@thwcoaching.com" style={{ fontSize: 12.5, color: 'var(--text-mid)', textDecoration: 'none' }}>support@thwcoaching.com</a>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {['Stripe', 'Visa', 'Mastercard', 'Apple Pay', 'G Pay'].map(m => (
            <span key={m} style={{ fontFamily: "'DM Mono', monospace", fontSize: 10.5, color: 'var(--text-dim)', padding: '4px 9px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg-card)' }}>{m}</span>
          ))}
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--text-dim)' }}>
          <Shield size={13} /> Paiement sécurisé par Stripe · Tokens sans expiration
        </div>
      </div>
    </footer>
  )
}

export { ArrowRight, Receipt }

// ── Styles locaux (helpers + keyframes du proto, adaptés au thème) ──
export function TopupStyles() {
  return (
    <style>{`
      .topup-wrap { max-width: 1080px; margin: 0 auto; padding-left: 24px; padding-right: 24px; }
      .topup-root { background: var(--bg); color: var(--text); min-height: 100vh; }
      .topup-back { transition: color .18s, border-color .18s; }
      .topup-back:hover { color: #06B6D4; border-color: #06B6D4; }
      .topup-eyebrow {
        display: inline-flex; align-items: center; gap: 8px;
        font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: .14em;
        text-transform: uppercase; color: var(--text-dim);
        padding: 6px 12px; border-radius: 999px; border: 1px solid var(--border-mid);
        background: var(--bg-card);
      }
      .topup-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; box-shadow: var(--shadow-card); }
      .btn-primary-lg {
        display: inline-flex; align-items: center; gap: 9px;
        padding: 14px 26px; border-radius: 12px; border: none;
        background: linear-gradient(135deg,#06B6D4,#5b6fff); color: #fff;
        font-family: 'DM Sans', sans-serif; font-size: 15px; font-weight: 600;
        text-decoration: none; cursor: pointer; box-shadow: 0 4px 22px rgba(6,182,212,0.36);
        transition: filter .16s, transform .16s;
      }
      .btn-primary-lg:hover { filter: brightness(1.08); }
      .btn-primary-lg:active { transform: scale(0.98); }
      .btn-ghost-lg {
        display: inline-flex; align-items: center; gap: 9px;
        padding: 13px 24px; border-radius: 12px; border: 1px solid var(--border-mid);
        background: var(--bg-card); color: var(--text-mid);
        font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 500;
        text-decoration: none; cursor: pointer; transition: color .16s, border-color .16s;
      }
      .btn-ghost-lg:hover { color: #06B6D4; border-color: #06B6D4; }
      .spinner { width:16px; height:16px; border-radius:50%; border:2px solid rgba(255,255,255,0.35); border-top-color:#fff; animation: topupSpin .7s linear infinite; }
      .pack-card { transition: transform .22s cubic-bezier(0.4,0,0.2,1), box-shadow .22s ease, border-color .22s ease; }
      .pack-card:hover { transform: translateY(-4px); }
      .topup-reveal { animation: topupRise .6s cubic-bezier(0.4,0,0.2,1) both; }
      @keyframes topupRise { from { transform: translateY(14px); } to { transform: none; } }
      @keyframes topupSpin { to { transform: rotate(360deg); } }
      @keyframes topupProGlow {
        0%,100% { box-shadow: 0 0 30px rgba(6,182,212,0.16), 0 0 60px rgba(91,111,255,0.08); }
        50% { box-shadow: 0 0 46px rgba(6,182,212,0.30), 0 0 90px rgba(91,111,255,0.16); }
      }
      @keyframes topupDrawCircle { to { stroke-dashoffset: 0; } }
      @keyframes topupDrawCheck  { to { stroke-dashoffset: 0; } }
      @keyframes topupPop { 0% { opacity:0; transform: scale(0.9);} 60% { transform: scale(1.03);} 100% { opacity:1; transform: scale(1);} }
      @keyframes topupPulse { 0%,100% { opacity:1; } 50% { opacity:.4; } }
      @media (prefers-reduced-motion: reduce) {
        .topup-reveal { animation: none !important; }
      }
      @media (max-width: 860px) {
        .packs-grid { grid-template-columns: 1fr !important; max-width: 440px !important; }
        .usage-grid { grid-template-columns: 1fr !important; }
        .steps-grid { grid-template-columns: 1fr !important; gap: 30px !important; }
        .steps-line { display: none !important; }
        .hdr-back-txt { display: none; }
      }
    `}</style>
  )
}
