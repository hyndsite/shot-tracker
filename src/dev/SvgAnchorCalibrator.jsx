// src/dev/SvgAnchorCalibrator.jsx
import { useMemo, useRef, useState } from "react"

// 1️⃣ Your image in /src/images
import courtImg from "../images/court-half.svg"

// 2️⃣ Your image's viewBox dimensions
const VIEWBOX = { minX: 0, minY: 0, width: 671, height: 995 }

// 3️⃣ Order of zones to click through (match your app's ZONES)
const ZONE_ORDER = [
  "left_corner_3", "left_wing_3", "left_slot_3", "center_3", "right_wing_3", "right_corner_3", "right_slot_3", "left_high_post", "left_low_post",
  "left_deep_mid", "left_short_corner", "left_wing_mid", "center_mid", "right_wing_mid", "right_short_corner", "right_deep_mid", "nail", "right_low_post",
  "right_high_post", "runner_floater", "free_throw"
]

export default function SvgAnchorCalibrator() {
  const svgRef = useRef(null)
  const [i, setI] = useState(0)
  const [anchors, setAnchors] = useState({}) // { zoneId: { x, y } }

  const currentId = ZONE_ORDER[i]
  const done = i >= ZONE_ORDER.length

  function onSvgClick(e) {
    if (done) return
    const svg = svgRef.current
    if (!svg) return
    // Convert screen coords → SVG viewBox coords
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const p = pt.matrixTransform(svg.getScreenCTM().inverse())
    const x = Number(p.x.toFixed(1))
    const y = Number(p.y.toFixed(1))
    setAnchors(prev => ({ ...prev, [currentId]: { x, y } }))
    setI(i + 1)
  }

  function undo() {
    if (i === 0) return
    const prevId = ZONE_ORDER[i - 1]
    const next = { ...anchors }
    delete next[prevId]
    setAnchors(next)
    setI(i - 1)
  }

  function resetAll() {
    if (!confirm("Clear all captured anchors?")) return
    setAnchors({})
    setI(0)
  }

  async function copyJson() {
    const json = JSON.stringify(anchors, null, 2)
    await navigator.clipboard.writeText(json)
    alert("Copied anchors JSON to clipboard.\nPaste it into src/constants/zoneAnchors.js")
  }

  const jsonPreview = useMemo(() => JSON.stringify(anchors, null, 2), [anchors])

  return (
    <div className="mx-auto max-w-3xl px-3 sm:px-4 pb-24 text-slate-900">
      <header className="mb-3">
        <h2 className="text-xl font-bold">SVG Anchor Calibrator</h2>
        <p className="text-sm text-slate-600">
          Click the court to set the anchor for:{" "}
          <b>{done ? "Done 🎉" : currentId}</b>
        </p>
      </header>

      <div className="flex flex-wrap gap-2 mb-3">
        <button className="btn btn-secondary" onClick={undo} disabled={i===0}>Undo</button>
        <button className="btn btn-secondary" onClick={resetAll}>Reset</button>
        <button className="btn btn-accent" onClick={copyJson} disabled={!done}>Copy JSON</button>
      </div>

      <section className="bg-white border border-slate-200 rounded-xl p-2">
        <svg
          ref={svgRef}
          viewBox={`${VIEWBOX.minX} ${VIEWBOX.minY} ${VIEWBOX.width} ${VIEWBOX.height}`}
          className="w-full h-auto"
          onClick={onSvgClick}
          style={{ cursor: done ? "default" : "crosshair" }}
        >
          {/* 🏀 Your court image layer */}
          <image
            href={courtImg}
            x={VIEWBOX.minX}
            y={VIEWBOX.minY}
            width={VIEWBOX.width}
            height={VIEWBOX.height}
            preserveAspectRatio="xMidYMid meet"
          />

          {/* 📍 Draw captured anchors */}
          {Object.entries(anchors).map(([id, p]) => (
            <g key={id} transform={`translate(${p.x}, ${p.y})`}>
              <rect x={-42} y={-14} width={84} height={22} rx={8} fill="#2563eb" />
              <text x="0" y="0" textAnchor="middle" dominantBaseline="middle"
                    fontSize="11" fill="#fff" fontWeight="600">
                {id}
              </text>
            </g>
          ))}

          {/* optional grid overlay for orientation */}
          <GridOverlay vb={VIEWBOX} every={100} />
        </svg>
      </section>

      <div className="mt-3">
        <div className="text-xs text-slate-600 mb-1">Anchors JSON preview:</div>
        <pre className="text-xs bg-slate-100 p-2 rounded overflow-auto">{jsonPreview}</pre>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Click zones in order. When finished, press <b>Copy JSON</b> and paste into
        <code> src/constants/zoneAnchors.js</code>.
      </p>
    </div>
  )
}

/** Light grid overlay (optional visual aid) */
function GridOverlay({ vb, every = 100 }) {
  const lines = []
  for (let x = vb.minX; x <= vb.minX + vb.width; x += every) {
    lines.push(<line key={`vx${x}`} x1={x} y1={vb.minY} x2={x} y2={vb.minY + vb.height} stroke="#e2e8f0" strokeWidth="0.5" />)
  }
  for (let y = vb.minY; y <= vb.minY + vb.height; y += every) {
    lines.push(<line key={`hy${y}`} x1={vb.minX} y1={y} x2={vb.minX + vb.width} y2={y} stroke="#e2e8f0" strokeWidth="0.5" />)
  }
  return <g>{lines}</g>
}
