// src/screens/GameLogger.jsx
import { useEffect, useMemo, useRef, useState } from "react"
import { addGameEvent, endGame, getSessionEvents } from "../lib/game-db"
import * as ZA from "../constants/zoneAnchors" // namespace import works for any export shape
import ShotModal from "../components/ShotModal.jsx"
import courtImg from "../images/court-half.svg"

/** Inline basketball SVG for plotted dots */
const BALL_SVG = (fill) =>
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'>
     <circle cx='12' cy='12' r='9' fill='${fill}' />
     <path d='M12 3v18M3 12h18M6 6l12 12M18 6L6 18' stroke='white' stroke-width='1.5' fill='none'/>
   </svg>`

/** Normalize whatever zoneAnchors exports into a map: { id: {x,y,label,isThree} } */
function normalizeAnchors(mod) {
  let raw = mod?.zoneAnchors ?? mod?.ZONE_ANCHORS ?? mod?.anchors ?? mod?.default ?? mod
  if (!raw) return {}
  if (raw === mod) raw = mod.zoneAnchors ?? mod.ZONE_ANCHORS ?? mod.anchors ?? mod.default ?? mod
  if (Array.isArray(raw)) {
    const m = {}
    for (const it of raw) {
      const id = it?.id ?? it?.key ?? it?.zoneId
      if (id) m[id] = it
    }
    return m
  }
  return raw
}

/** Decide how coordinates are expressed: 'fraction' (0..1), 'percent' (0..100), or 'pixel' (>100) */
function detectCoordMode(map) {
  const vals = Object.values(map)
  if (!vals.length) return "percent"
  let maxX = -Infinity, maxY = -Infinity
  for (const a of vals) {
    if (typeof a?.x !== "number" || typeof a?.y !== "number") continue
    if (a.x > maxX) maxX = a.x
    if (a.y > maxY) maxY = a.y
  }
  if (maxX <= 1 && maxY <= 1) return "fraction" // 0..1
  if (maxX > 100 || maxY > 100) return "pixel"  // px
  return "percent"                              // 0..100
}

/** Convert map -> { id: { leftPct, topPct, label, isThree } } given image size */
function toPercentAnchors(map, coordMode, imgW, imgH) {
  const out = {}
  for (const [id, a] of Object.entries(map)) {
    if (typeof a?.x !== "number" || typeof a?.y !== "number") continue
    let leftPct, topPct
    if (coordMode === "fraction") {
      leftPct = a.x * 100
      topPct = a.y * 100
    } else if (coordMode === "pixel") {
      if (!imgW || !imgH) continue // wait for image size
      leftPct = (a.x / imgW) * 100
      topPct = (a.y / imgH) * 100
    } else { // percent
      leftPct = a.x
      topPct = a.y
    }
    out[id] = { leftPct, topPct, label: a.label ?? id, isThree: !!a.isThree }
  }
  return out
}

export default function GameLogger({ session, onEnd, readOnly = false }) {
  const [events, setEvents] = useState([])
  const [modal, setModal] = useState({ open: false, zone: null })

  // 1) Load session events
  useEffect(() => {
    (async () => setEvents(await getSessionEvents(session.id)))()
  }, [session.id])

  // 2) Anchors & coordinate normalization
  const rawAnchors = useMemo(() => normalizeAnchors(ZA), [])
  const coordMode = useMemo(() => detectCoordMode(rawAnchors), [rawAnchors])

  // We'll compute percent positions after we know the image's natural size (for pixel mode)
  const [imgSize, setImgSize] = useState({ w: 0, h: 0, ready: false })

  // Percent anchors derived from raw + coord mode + image size
  const pctAnchors = useMemo(() => {
    return toPercentAnchors(rawAnchors, coordMode, imgSize.w, imgSize.h)
  }, [rawAnchors, coordMode, imgSize])

  // 3) Zone tap -> open modal
  function onZoneTap(zoneId) {
    if (readOnly) return
    const z = pctAnchors[zoneId]
    if (!z) return
    setModal({ open: true, zone: { id: zoneId, label: z.label, isThree: z.isThree } })
  }

  // 4) Modal submit -> create event
  async function handleSubmitShot({ isThree, shotContext, contested, result }) {
    const z = pctAnchors[modal.zone.id]
    const ev = {
      id: crypto.randomUUID(),
      sessionId: session.id,
      userId: session.userId,
      ts: Date.now(),
      zoneId: modal.zone.id,
      zoneLabel: z?.label ?? modal.zone.id,
      isThree: !!isThree,
      shotContext,       // 'Catch & Shoot' | 'Off Dribble'
      contested: !!contested,
      result,            // 'make' | 'miss'
    }
    await addGameEvent(ev)
    setEvents((prev) => [ev, ...prev])
  }

  async function handleEnd() {
    if (readOnly) return
    if (confirm("End the Game?")) {
      await endGame(session.id)
      onEnd?.()
    }
  }

  // 5) Dots for plotted shots (use the same percent anchors)
  const dots = useMemo(() => {
    const ordered = [...events].reverse()
    return ordered.map((e) => {
      const a = pctAnchors[e.zoneId]
      if (!a) return null
      const fill = e.result === "make" ? "#16a34a" : "#9ca3af"
      return {
        key: e.id,
        leftPct: a.leftPct,
        topPct: a.topPct,
        url: "data:image/svg+xml;utf8," + encodeURIComponent(BALL_SVG(fill)),
      }
    }).filter(Boolean)
  }, [events, pctAnchors])

  return (
    <div className="p-3 space-y-3">
      <header className="flex items-center justify-between">
        <div className="text-sm text-gray-700">
          {session.teamName} vs {session.opponentName} · {session.homeAway} · {session.level}
        </div>
        {!readOnly && (
          <button className="rounded border px-3 py-1" onClick={handleEnd}>
            End Game
          </button>
        )}
      </header>

      <Court
        onTapZone={onZoneTap}
        pctAnchors={pctAnchors}
        dots={dots}
        onImgReady={(w, h) => setImgSize({ w, h, ready: true })}
        coordMode={coordMode}
      />

      <ShotModal
        open={modal.open}
        zone={modal.zone}
        onClose={() => setModal({ open: false, zone: null })}
        onSubmit={handleSubmitShot}
      />
    </div>
  )
}

/** Court: renders the court image, clickable zone hit-areas, and plotted dots */
function Court({ onTapZone, pctAnchors, dots, onImgReady }) {
  const imgRef = useRef(null)

  useEffect(() => {
    const img = imgRef.current
    if (!img) return
    if (img.complete && img.naturalWidth) {
      onImgReady(img.naturalWidth, img.naturalHeight)
    } else {
      const onLoad = () => onImgReady(img.naturalWidth, img.naturalHeight)
      img.addEventListener("load", onLoad)
      return () => img.removeEventListener("load", onLoad)
    }
  }, [onImgReady])

  return (
    <div className="relative mx-auto select-none" style={{ maxWidth: 520 }}>
      <img ref={imgRef} src={courtImg} alt="court" className="w-full block" />

      {/* Zone hit areas (click targets) */}
      {Object.entries(pctAnchors).map(([id, a]) => (
        <button
          key={id}
          className="absolute -translate-x-1/2 -translate-y-1/2 z-20"
          style={{ left: `${a.leftPct}%`, top: `${a.topPct}%` }}
          onClick={() => onTapZone(id)}
          aria-label={a.label || id}
        >
          {/* Invisible but accessible circle; visible on focus/hover */}
          <span className="block h-6 w-6 rounded-full opacity-0 focus:opacity-30 hover:opacity-10 bg-black" />
        </button>
      ))}

      {/* Plotted shots (under hit targets) */}
      {dots.map((d) => (
        <img
          key={d.key}
          src={d.url}
          alt=""
          className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10"
          style={{ left: `${d.leftPct}%`, top: `${d.topPct}%` }}
        />
      ))}
    </div>
  )
}
