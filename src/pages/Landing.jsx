export default function Landing() {
  return (
    <div style={{
      position: 'relative',
      zIndex: 2,
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '16px'
    }}>
      <h1 style={{
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: 'clamp(48px, 10vw, 120px)',
        fontWeight: 700,
        color: '#ffffff',
        letterSpacing: '-0.02em',
        textAlign: 'center'
      }}>
        DRAWER
      </h1>
      <p style={{
        fontFamily: "'Space Mono', monospace",
        fontSize: '11px',
        letterSpacing: '0.4em',
        color: '#00d4ff',
        textTransform: 'uppercase'
      }}>
        Engineering Graphics Guide — S3 Coming
      </p>
    </div>
  )
}
