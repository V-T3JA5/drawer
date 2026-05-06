import './BlueprintGrid.css'

export default function BlueprintGrid() {
  return (
    <div className="blueprint-grid-wrap" aria-hidden="true">
      <div className="grid-fine" />
      <div className="grid-major" />
      <div className="grid-vignette" />
    </div>
  )
}
