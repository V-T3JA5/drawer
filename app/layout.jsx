import './globals.css'

export const metadata = {
  title: 'DRAWER',
  description: 'AutoCAD tutorials for engineering students.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Preconnect for Google Fonts performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>

        {/* ─────────────────────────────────────────────────────────────
            THREE.JS CANVAS
            Fixed fullscreen background. Renders particles + 3D objects.
            z-index: 0
            Component: <ParticleCanvas /> (to be created)
        ───────────────────────────────────────────────────────────── */}
        {/* <ParticleCanvas /> */}

        {/* ─────────────────────────────────────────────────────────────
            DRAWER HEADER
            Fixed top. Site title + navigation.
            z-index: 100
            Component: <Header /> (to be created)
        ───────────────────────────────────────────────────────────── */}
        {/* <Header /> */}

        {/* ─────────────────────────────────────────────────────────────
            PAGE CONTENT
            Scrollable layer. Glass UI cards live here.
            z-index: 10
        ───────────────────────────────────────────────────────────── */}
        <main style={{ position: 'relative', zIndex: 10 }}>
          {children}
        </main>

        {/* ─────────────────────────────────────────────────────────────
            TJ WATERMARK
            Fixed bottom-right. Subtle branding mark.
            z-index: 50
            Component: <Watermark /> (to be created)
        ───────────────────────────────────────────────────────────── */}
        {/* <Watermark /> */}

        {/* ─────────────────────────────────────────────────────────────
            LOADER
            Full-screen entry animation. Unmounts after sequence.
            z-index: 9998
            Component: <Loader /> (to be created)
        ───────────────────────────────────────────────────────────── */}
        {/* <Loader /> */}

        {/* ─────────────────────────────────────────────────────────────
            CURSOR
            Custom cursor replacing the native one.
            z-index: 9999
            Component: <Cursor /> (to be created)
        ───────────────────────────────────────────────────────────── */}
        {/* <Cursor /> */}

      </body>
    </html>
  )
}
