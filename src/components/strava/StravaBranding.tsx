'use client'

/**
 * Composants de conformité à la marque Strava (Strava Brand Guidelines).
 *
 * Exigences couvertes pour la demande d'augmentation de quota API :
 *  1. « Connect with Strava » : bouton officiel orange + marque Strava.
 *  2. « Powered by Strava » : badge d'attribution sur toute vue affichant des
 *     données Strava.
 *  3. « View on Strava » : lien retour vers l'activité source sur strava.com.
 *
 * Note conformité : les libellés de marque (« Connect with Strava »,
 * « Powered by Strava », « View on Strava ») et la couleur orange officielle
 * (#FC4C02) NE doivent PAS être traduits ni modifiés — ce sont des marques
 * déposées. Ils restent donc en dur ici, volontairement.
 *
 * Le logo utilisé est la marque angulaire officielle Strava (chevrons). Pour un
 * rendu 100 % pixel-perfect lors de la revue Strava, les lockups officiels
 * téléchargeables depuis le Strava Brand Center peuvent remplacer ces SVG —
 * voir docs/STRAVA_BRANDING.md.
 */

const STRAVA_ORANGE = '#FC4C02'

// Marque angulaire officielle Strava (les deux chevrons).
function StravaMark({ size = 16, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066l-2.084 4.116z" fill={color} />
      <path d="M11.214 13.828l2.084-4.116 2.089 4.116h3.066L13.298 3.656l-5.15 10.172h3.066z" fill={color} />
    </svg>
  )
}

// Wordmark STRAVA (SVG text, casse et graisse proches du logotype officiel).
function StravaWordmark({ height = 12, color = STRAVA_ORANGE }: { height?: number; color?: string }) {
  return (
    <span
      style={{
        fontFamily: '"Arial Narrow", "Helvetica Neue", Arial, sans-serif',
        fontWeight: 800,
        fontSize: height,
        letterSpacing: '0.06em',
        lineHeight: 1,
        color,
        textTransform: 'uppercase',
      }}
    >
      Strava
    </span>
  )
}

/**
 * Bouton officiel « Connect with Strava ».
 * À utiliser partout où l'utilisateur initie la connexion OAuth Strava.
 */
export function ConnectWithStrava({
  onClick,
  href,
  height = 40,
}: {
  onClick?: () => void
  href?: string
  height?: number
}) {
  const content = (
    <>
      <StravaMark size={Math.round(height * 0.5)} color="#fff" />
      <span
        style={{
          fontFamily: 'DM Sans, "Helvetica Neue", Arial, sans-serif',
          fontWeight: 700,
          fontSize: Math.max(12, Math.round(height * 0.34)),
          color: '#fff',
          whiteSpace: 'nowrap',
        }}
      >
        Connect with Strava
      </span>
    </>
  )
  const style: React.CSSProperties = {
    height,
    padding: `0 ${Math.round(height * 0.45)}px`,
    borderRadius: Math.round(height * 0.16),
    background: STRAVA_ORANGE,
    border: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    cursor: 'pointer',
    textDecoration: 'none',
    transition: 'filter 160ms',
  }
  const hover = (e: React.MouseEvent<HTMLElement>, on: boolean) => {
    ;(e.currentTarget as HTMLElement).style.filter = on ? 'brightness(1.06)' : 'none'
  }
  if (href) {
    return (
      <a href={href} style={style} onMouseEnter={e => hover(e, true)} onMouseLeave={e => hover(e, false)}>
        {content}
      </a>
    )
  }
  return (
    <button type="button" onClick={onClick} style={style} onMouseEnter={e => hover(e, true)} onMouseLeave={e => hover(e, false)}>
      {content}
    </button>
  )
}

/**
 * Badge « Powered by Strava ».
 * À afficher sur toute surface montrant des données issues de Strava
 * (feed d'activités, détail d'activité, page perf, page connexions).
 */
export function PoweredByStrava({
  variant = 'orange',
  height = 14,
}: {
  variant?: 'orange' | 'light' | 'muted'
  height?: number
}) {
  const color = variant === 'orange' ? STRAVA_ORANGE : variant === 'light' ? '#fff' : 'var(--text-dim)'
  return (
    <span
      style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
      aria-label="Powered by Strava"
    >
      <span
        style={{
          fontFamily: 'DM Sans, "Helvetica Neue", Arial, sans-serif',
          fontSize: Math.round(height * 0.72),
          fontWeight: 600,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: variant === 'orange' ? 'var(--text-dim)' : color,
          opacity: 0.9,
        }}
      >
        Powered by
      </span>
      <StravaWordmark height={height} color={color} />
    </span>
  )
}

/**
 * Lien « View on Strava » vers l'activité source.
 * `activityId` = strava_id numérique de l'activité.
 */
export function ViewOnStrava({
  activityId,
  height = 30,
}: {
  activityId: string | number
  height?: number
}) {
  return (
    <a
      href={`https://www.strava.com/activities/${activityId}`}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        height,
        padding: `0 ${Math.round(height * 0.4)}px`,
        borderRadius: Math.round(height * 0.2),
        background: 'rgba(252,76,2,0.10)',
        border: '1px solid rgba(252,76,2,0.30)',
        color: STRAVA_ORANGE,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontFamily: 'DM Sans, sans-serif',
        fontSize: Math.max(11, Math.round(height * 0.4)),
        fontWeight: 600,
        textDecoration: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      <StravaMark size={Math.round(height * 0.5)} color={STRAVA_ORANGE} />
      View on Strava
    </a>
  )
}
