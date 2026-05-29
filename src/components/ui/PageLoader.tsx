'use client'

export function PageLoader() {
  return (
    <div
      data-page-loader=""
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 8000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logos/logo_4bras.png"
        alt=""
        width={64}
        height={64}
        style={{
          width: 64,
          height: 64,
          animation: 'spinPause 3s ease-in-out infinite',
        }}
      />
    </div>
  )
}
