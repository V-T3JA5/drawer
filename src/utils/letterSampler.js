/**
 * letterSampler.js
 *
 * Rasterizes text into an offscreen Canvas2D, samples filled pixels,
 * and returns them as normalized 3D positions centred at origin.
 *
 * To swap the font: change FONT_FAMILY below. The effect auto-adapts.
 * Recommended swap point: once the site font is finalised (S4b or later).
 */

const FONT_FAMILY = 'monospace'

/**
 * sampleLetterPositions
 *
 * @param {string}  text          - Text to rasterize, e.g. "TJ" or "DRAWER"
 * @param {number}  canvasWidth   - Offscreen canvas width in px
 * @param {number}  canvasHeight  - Offscreen canvas height in px
 * @param {number}  fontSize      - Font size in px (fills ~70% of canvasHeight)
 * @param {number}  targetCount   - Approximate number of sample points to return
 * @param {number}  depth         - Z-spread of returned points (adds slight depth)
 *
 * @returns {Float32Array} - Flat array [x0,y0,z0, x1,y1,z1, ...] in Three.js world units
 *                           Centred at origin. X range ≈ [-aspectRatio, aspectRatio], Y range ≈ [-1, 1]
 */
export function sampleLetterPositions(
  text,
  canvasWidth = 1024,
  canvasHeight = 256,
  fontSize = 180,
  targetCount = 1200,
  depth = 0.15
) {
  const canvas = document.createElement('canvas')
  canvas.width = canvasWidth
  canvas.height = canvasHeight

  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvasWidth, canvasHeight)

  ctx.fillStyle = '#ffffff'
  ctx.font = `900 ${fontSize}px ${FONT_FAMILY}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, canvasWidth / 2, canvasHeight / 2)

  const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight)
  const pixels = imageData.data

  // Collect all filled pixel positions (alpha > 128)
  const filledPixels = []
  for (let y = 0; y < canvasHeight; y++) {
    for (let x = 0; x < canvasWidth; x++) {
      const idx = (y * canvasWidth + x) * 4
      if (pixels[idx + 3] > 128) {
        filledPixels.push([x, y])
      }
    }
  }

  if (filledPixels.length === 0) {
    console.warn(`[letterSampler] No pixels found for text: "${text}". Check font loading.`)
    return new Float32Array(0)
  }

  // Subsample to targetCount
  const step = Math.max(1, Math.floor(filledPixels.length / targetCount))
  const sampled = []
  for (let i = 0; i < filledPixels.length; i += step) {
    sampled.push(filledPixels[i])
  }

  // Normalise to world coordinates centred at origin
  // X: [-aspectRatio, +aspectRatio], Y: [-1, +1]
  const aspect = canvasWidth / canvasHeight
  const positions = new Float32Array(sampled.length * 3)

  for (let i = 0; i < sampled.length; i++) {
    const [px, py] = sampled[i]
    const x = (px / canvasWidth) * 2 * aspect - aspect
    const y = -((py / canvasHeight) * 2 - 1)
    const z = (Math.random() - 0.5) * depth
    positions[i * 3 + 0] = x
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = z
  }

  return positions
}

/**
 * getBounds
 *
 * Returns the bounding box [xMin, xMax, yMin, yMax] for a sampled position array.
 * Used to centre camera / scale framing if needed.
 */
export function getBounds(positions) {
  let xMin = Infinity, xMax = -Infinity
  let yMin = Infinity, yMax = -Infinity

  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i]
    const y = positions[i + 1]
    if (x < xMin) xMin = x
    if (x > xMax) xMax = x
    if (y < yMin) yMin = y
    if (y > yMax) yMax = y
  }

  return { xMin, xMax, yMin, yMax }
}
