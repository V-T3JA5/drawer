export default function BlueprintGrid() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      {/* Major grid */}
      <div className="blueprint-grid" style={{ position: 'absolute', inset: 0 }} />

      {/* Radial fade from center — feels like a drafting lamp */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse 80% 60% at 50% 40%, transparent 0%, rgba(0,5,8,0.7) 100%)',
        }}
      />
    </div>
  )
}
