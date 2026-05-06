import './TJWatermark.css'

export default function TJWatermark() {
  return (
    <div className="tj-watermark-wrap" aria-hidden="true">
      <div className="tj-glow-ring tj-glow-ring-1" />
      <div className="tj-glow-ring tj-glow-ring-2" />
      <div className="tj-glow-ring tj-glow-ring-3" />
      <span className="tj-label">TJ</span>
    </div>
  )
}
