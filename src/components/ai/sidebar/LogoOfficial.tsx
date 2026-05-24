'use client'

/**
 * Logo officiel THW — utilise /public/logo.png.
 * Source unique du shuriken THW pour toute l'interface IA.
 */
export function LogoOfficial({ size = 18, alt = 'THW' }: { size?: number; alt?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.png"
      alt={alt}
      width={size}
      height={size}
      style={{ width: size, height: size, objectFit: 'contain', display: 'block', flexShrink: 0 }}
    />
  )
}

export default LogoOfficial
