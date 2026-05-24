import './globals.css'

export const metadata = {
  title: 'DRAWER',
  description: 'AutoCAD tutorials for engineering students',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0a0a0a] text-[#E8E8E8] relative">

        {/* TODO: ThreeCanvas — full-screen particle system, sits behind everything */}

        {/* TODO: Custom cursor — small crimson crosshair, cursor:none on body */}

        {/* TODO: DRAWER header — fixed top, glass-card, site nav */}

        <main className="relative z-10">
          {children}
        </main>

        {/* TODO: TJ watermark — bottom-right corner, faint glow-text, fixed */}

      </body>
    </html>
  )
}
