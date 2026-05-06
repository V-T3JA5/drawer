import { useParams, Link } from 'react-router-dom'

export default function WeekPage() {
  const { weekId } = useParams()
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
      gap: '24px'
    }}>
      <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', letterSpacing: '0.4em', color: '#00d4ff' }}>
        WEEK {weekId}
      </p>
      <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '48px', color: '#fff' }}>
        Tutorial Page
      </h1>
      <Link to="/" style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: '#00d4ff', letterSpacing: '0.2em' }}>
        ← BACK
      </Link>
    </div>
  )
}
