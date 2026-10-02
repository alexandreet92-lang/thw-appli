'use client'
// ══════════════════════════════════════════════════════════════════════════
// Kit des écrans d'entrée (auth + questionnaire) — maquettes A1→A5 validées.
// Grammaire mobile « Claude iOS / Strava » : page gris chaud --surface-page,
// champs et cartes blancs --surface-card, gros titres, pilules pleine largeur.
// Desktop : même rendu dans une colonne centrée de 440 px.
// Couleurs : tokens uniquement, sauf les boutons de marque Apple / Google dont
// les couleurs sont imposées par leurs chartes (annotées design-allow-color).
// ══════════════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useI18n } from '@/lib/i18n'
import { LANGS } from '@/lib/i18n/dictionaries'
import { SheetCloseBtn, SheetPill, SHEET_CARD_SHADOW } from '@/components/ui/BottomSheet'
import { Switch } from '@/components/shadcn/switch'
import type { SocialProvider } from '@/lib/native/socialAuth'

export const FB = 'var(--font-body)'
/** Wordmark « Hybrid » : toujours en Fraunces (le token display passe en Inter sur mobile). */
export const FS = 'var(--font-serif)'

// Feuille de style partagée : thème des boutons de marque, titres, entrées
// animées. prefers-reduced-motion → plus aucune animation.
export const AUTH_CSS = `
.au-col{width:100%;max-width:440px;margin:0 auto;box-sizing:border-box}
.au-h1{font-family:var(--font-display);font-size:28px;font-weight:600;letter-spacing:-0.02em;line-height:1.15;color:var(--text);margin:0}
@media(max-width:767px){.au-h1{font-weight:800}}
.au-sub{font-family:var(--font-body);font-size:15px;line-height:1.45;color:var(--text-mid);margin:6px 0 0}
.au-btn{width:100%;height:56px;border:none;border-radius:var(--r-pill);display:flex;align-items:center;justify-content:center;gap:10px;font-family:var(--font-body);font-size:17px;font-weight:700;letter-spacing:-0.01em;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:transform .16s ease,opacity .2s ease,filter .16s ease}
.au-btn:active:not(:disabled){transform:scale(.98)}
.au-btn:disabled{cursor:default}
.au-btn[data-dim="1"]{opacity:.5}
.au-btn:focus-visible{outline:none;box-shadow:0 0 0 3px var(--primary-dim)}
.au-apple{background:#000;color:#fff} /* design-allow-color — charte Apple : bouton noir */
.dark .au-apple{background:#fff;color:#000} /* design-allow-color — charte Apple : bouton blanc sur fond sombre */
.au-google{background:var(--surface-card);color:var(--text);box-shadow:${SHEET_CARD_SHADOW}}
.au-mail{background:var(--primary);color:var(--on-primary)}
.au-link{color:var(--primary);font-weight:700;background:none;border:none;padding:0;cursor:pointer;font-family:var(--font-body)}
@keyframes auLogo{from{opacity:0;transform:scale(.55)}to{opacity:1;transform:scale(1)}}
@keyframes auRise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes auFade{from{opacity:0}to{opacity:1}}
@keyframes auDot{0%,80%,100%{opacity:.25;transform:scale(.8)}40%{opacity:1;transform:scale(1)}}
@keyframes auShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
.au-logo{animation:auLogo .75s cubic-bezier(.16,1,.3,1) both}
.au-rise{animation:auRise .6s cubic-bezier(.22,1,.36,1) both;animation-delay:var(--d,0ms)}
.au-fade{animation:auFade .5s ease both;animation-delay:var(--d,0ms)}
.au-wait{opacity:0}
.au-dot{width:6px;height:6px;border-radius:50%;background:currentColor;animation:auDot 1s ease-in-out infinite}
.au-shake{animation:auShake .4s cubic-bezier(.36,.07,.19,.97)}
@media(prefers-reduced-motion:reduce){
  .au-logo,.au-rise,.au-fade,.au-shake{animation:none!important}
  .au-dot{animation:none}
  .au-btn{transition:none}
}
`

/** Trois points qui respirent (état « en cours » d'un bouton — jamais de spinner). */
export function Dots() {
  return (
    <span aria-hidden style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}>
      {[0, 1, 2].map(i => <span key={i} className="au-dot" style={{ animationDelay: `${i * 140}ms` }} />)}
    </span>
  )
}

/** Page plein écran (gris chaud) + colonne centrée, marges sûres iOS. */
export function AuthScreen({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--surface-page)', display: 'flex', flexDirection: 'column', ...style }}>
      <div className="au-col" style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        padding: 'calc(env(safe-area-inset-top) + 12px) 20px calc(env(safe-area-inset-bottom) + 20px)',
      }}>
        {children}
      </div>
    </div>
  )
}

/** Bouton retour rond flottant (‹). */
export function BackButton({ onClick }: { onClick: () => void }) {
  const { t } = useI18n()
  return <SheetCloseBtn back onClick={onClick} label={t('onboarding.back')} />
}

/** Grand titre + sous-titre gris. */
export function AuthHeading({ title, sub }: { title: ReactNode; sub?: ReactNode }) {
  return (
    <div style={{ margin: '18px 4px 22px' }}>
      <h1 className="au-h1">{title}</h1>
      {sub && <p className="au-sub">{sub}</p>}
    </div>
  )
}

/** Pilule principale cyan (état chargement intégré). */
export function PrimaryPill({ children, onClick, disabled, loading, type = 'button' }: {
  children: ReactNode; onClick?: () => void; disabled?: boolean; loading?: boolean; type?: 'button' | 'submit'
}) {
  return (
    <SheetPill type={type} onClick={onClick} disabled={disabled || loading} style={{ minHeight: 56, fontSize: 17 }}>
      {loading ? <Dots /> : children}
    </SheetPill>
  )
}

// ── Segmented Connexion / Créer un compte ────────────────────────────────
export function AuthSegmented({ value, onChange, labels }: { value: 0 | 1; onChange: (v: 0 | 1) => void; labels: [string, string] }) {
  return (
    <div role="tablist" style={{ position: 'relative', display: 'flex', padding: 4, borderRadius: 'var(--r-pill)', background: 'var(--surface-chip)', marginBottom: 20 }}>
      <span aria-hidden style={{
        position: 'absolute', top: 4, bottom: 4, left: 4, width: 'calc(50% - 4px)', borderRadius: 'var(--r-pill)',
        background: 'var(--surface-card)', boxShadow: 'var(--shadow-card)',
        transform: value === 1 ? 'translateX(100%)' : 'none', transition: 'transform .32s cubic-bezier(.32,.72,0,1)',
      }} />
      {labels.map((l, i) => (
        <button key={l} type="button" role="tab" aria-selected={value === i} onClick={() => onChange(i as 0 | 1)} style={{
          position: 'relative', zIndex: 1, flex: 1, minHeight: 44, border: 'none', background: 'transparent', cursor: 'pointer',
          fontFamily: FB, fontSize: 15, fontWeight: value === i ? 700 : 600, color: value === i ? 'var(--text)' : 'var(--text-mid)',
          transition: 'color .2s',
        }}>{l}</button>
      ))}
    </div>
  )
}

// ── Interrupteur iOS + libellé ───────────────────────────────────────────
export function ToggleRow({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontFamily: FB, fontSize: 14, color: 'var(--text)', whiteSpace: 'nowrap' }}>
      {/* Interrupteur iOS un cran plus compact (maquette) : 51 → 42 px. */}
      <span style={{ display: 'inline-flex', transform: 'scale(0.82)', margin: '0 -5px' }}>
        <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
      </span>
      {label}
    </label>
  )
}

// ── Boutons de marque ────────────────────────────────────────────────────
export function AppleLogo({ size = 20 }: { size?: number }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{ display: 'block', marginTop: -2 }}>
      <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.67.91-1.377 0-2.332-1.26-3.428-2.8-1.287-1.82-2.323-4.63-2.323-7.28 0-4.28 2.797-6.55 5.552-6.55 1.448 0 2.675.95 3.6.95.865 0 2.222-1.01 3.902-1.01.613 0 2.886.06 4.374 2.19-.13.09-2.383 1.37-2.383 4.19 0 3.26 2.854 4.42 2.955 4.45z" />
    </svg>
  )
}

export function GoogleLogo({ size = 20 }: { size?: number }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 18 18" fill="none" style={{ display: 'block' }}>
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 14.013 17.64 11.705 17.64 9.2z" fill="#4285F4" /> {/* design-allow-color — charte Google (G 4 couleurs) */}
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853" /> {/* design-allow-color — charte Google (G 4 couleurs) */}
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" /> {/* design-allow-color — charte Google (G 4 couleurs) */}
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" /> {/* design-allow-color — charte Google (G 4 couleurs) */}
    </svg>
  )
}

/**
 * « Continuer avec Apple » puis « Continuer avec Google » (ordre imposé :
 * Apple d'abord). `busy` = fournisseur en cours → ses points s'animent, les
 * autres boutons sont désactivés.
 */
export function SocialButtons({ busy, onPick, stagger }: {
  busy: SocialProvider | null; onPick: (p: SocialProvider) => void; stagger?: (i: number) => CSSProperties | undefined
}) {
  const { t } = useI18n()
  const any = busy !== null
  return (
    <>
      <button type="button" className={`au-btn au-apple${stagger ? ' au-rise' : ''}`} style={stagger?.(0)} disabled={any}
        data-dim={any && busy !== 'apple' ? '1' : undefined} onClick={() => onPick('apple')}>
        {busy === 'apple' ? <Dots /> : <><AppleLogo />{t('auth.apple')}</>}
      </button>
      <button type="button" className={`au-btn au-google${stagger ? ' au-rise' : ''}`} style={stagger?.(1)} disabled={any}
        data-dim={any && busy !== 'google' ? '1' : undefined} onClick={() => onPick('google')}>
        {busy === 'google' ? <Dots /> : <><GoogleLogo />{t('auth.google')}</>}
      </button>
    </>
  )
}

/** Séparateur « ou ». */
export function OrDivider() {
  const { t } = useI18n()
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '22px 4px' }}>
      <span style={{ flex: 1, height: 1, background: 'var(--border-mid)' }} />
      <span style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-dim)' }}>{t('auth.or')}</span>
      <span style={{ flex: 1, height: 1, background: 'var(--border-mid)' }} />
    </div>
  )
}

/** Ligne légale (CGU + confidentialité) — pages du site, ouvertes hors app en natif. */
export function LegalLine({ style }: { style?: CSSProperties }) {
  const { t } = useI18n()
  const a: CSSProperties = { color: 'inherit', textDecoration: 'underline', textUnderlineOffset: 2 }
  return (
    <p style={{ fontFamily: FB, fontSize: 12, lineHeight: 1.45, color: 'var(--text-dim)', textAlign: 'center', margin: '8px 8px 0', ...style }}>
      {t('au.legalPre')}{' '}
      <a href="/site/conditions-utilisation.html" target="_blank" rel="noopener" style={a}>{t('auth.termsCgu')}</a>{' '}
      {t('auth.termsAnd')}{' '}
      <a href="/site/confidentialite.html" target="_blank" rel="noopener" style={a}>{t('auth.termsPrivacy')}</a>.
    </p>
  )
}

/** Pilule de langue compacte (« FR ⌄ ») + menu animé. */
export function LangPill() {
  const { lang, setLang, t } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const f = (e: PointerEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('pointerdown', f)
    return () => document.removeEventListener('pointerdown', f)
  }, [open])
  return (
    <div ref={ref} style={{ position: 'relative', zIndex: 20 }}>
      <button type="button" onClick={() => setOpen(o => !o)} aria-haspopup="listbox" aria-expanded={open} aria-label={t('welcome.lang')} style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, height: 40, padding: '0 14px 0 16px', border: 'none', borderRadius: 'var(--r-pill)',
        background: 'var(--float-bg)', boxShadow: SHEET_CARD_SHADOW, color: 'var(--text)', cursor: 'pointer',
        fontFamily: FB, fontSize: 14, fontWeight: 800, letterSpacing: '0.02em',
      }}>
        {lang.toUpperCase()}
        <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}><path d="M6 9l6 6 6-6" /></svg>
      </button>
      <div role="listbox" style={{
        position: 'absolute', top: 46, right: 0, minWidth: 168, padding: 6, transformOrigin: 'top right',
        background: 'var(--surface-card)', borderRadius: 'var(--r-md)', boxShadow: 'var(--shadow-capsule)',
        opacity: open ? 1 : 0, transform: open ? 'none' : 'translateY(-6px) scale(.96)', pointerEvents: open ? 'auto' : 'none',
        transition: 'opacity .18s ease, transform .22s cubic-bezier(.16,1,.3,1)',
      }}>
        {LANGS.map(l => {
          const on = l.code === lang
          return (
            <button key={l.code} type="button" role="option" aria-selected={on} onClick={() => { setLang(l.code); setOpen(false) }} style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%', minHeight: 44, padding: '0 12px', border: 'none', borderRadius: 'var(--r-sm)',
              background: on ? 'var(--primary-dim)' : 'transparent', color: on ? 'var(--primary)' : 'var(--text)', cursor: 'pointer',
              fontFamily: FB, fontSize: 15, fontWeight: on ? 700 : 500, textAlign: 'left',
            }}>
              <span style={{ flex: 1 }}>{l.label}</span>
              {on && <svg aria-hidden width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 6" /></svg>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Logo de marque (shuriken). */
export function BrandMark({ size = 64, className }: { size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logos/logo_4bras.png" alt="" width={size} height={size} className={className}
      style={{ width: size, height: size, display: 'block', objectFit: 'contain' }} />
  )
}

/** Bandeau de succès sobre (texte teinté, pas de surface colorée). */
export function SuccessNote({ children }: { children: ReactNode }) {
  return (
    <div role="status" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '14px 16px', borderRadius: 'var(--r-md)', background: 'var(--surface-card)', boxShadow: SHEET_CARD_SHADOW, marginTop: 16 }}>
      <span aria-hidden style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, background: 'var(--success)', color: 'var(--on-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 6" /></svg>
      </span>
      <p style={{ margin: 0, fontFamily: FB, fontSize: 14, lineHeight: 1.45, color: 'var(--text)' }}>{children}</p>
    </div>
  )
}
