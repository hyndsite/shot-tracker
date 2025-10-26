import { useEffect, useMemo, useRef, useState } from "react"
import { addGameEvent, endGame, getSessionEvents } from "../lib/game-db"
import * as ZA from "../constants/zoneAnchors"     // anchors (positions)
import * as CONST from "../constants"              // zone meta (has isThree for zone name)
import ShotModal from "../components/ShotModal.jsx"

// IMPORTANT: if your current file shows tan rectangles, switch this import
// to the "plain" court SVG you used previously (e.g. 'half-court-plain.svg').
import courtImg from "../images/court-half.svg"

/** Tiny basketball SVG for plotted dots */
const BALL_SVG = (fill) =>
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'>
     <circle cx='12' cy='12' r='9' fill='${fill}' />
     <path d='M12 3v18M3 12h18M6 6l12 12M18 6L6 18' stroke='white' stroke-width='1.5' fill='none'/>
   </svg>`

/* ---------- helpers: normalize anchors & constants ---------- */

// Accept any export shape from zoneAnchors.js and build a map: id -> { x,y,label }
function normalizeAnchors(mod) {
  let raw = mod?.zoneAnchors ?? mod?.ZONE_ANCHORS ?? mod?.anchors ?? mod?.default ?? mod
  if (!raw) return {}
  if (raw === mod) raw = mod.zoneAnchors ?? mod.ZONE_ANCHORS ?? mod.anchors ?? mod.default ?? mod
  if (Array.isArray(raw)) {
    const m = {}
    for (const it of raw) {
      const id = it?.id ?? it?.key ?? it?.zoneId ?? it?.name
      if (id) m[id] = it
    }
    return m
  }
  return raw
}

// Accept any export shape from constants.js and build a map: label/id -> { isThree, label }
function normalizeZoneMeta(mod) {
  // Look for common names
  const candidates = [
    mod?.ZONES, mod?.zones, mod?.ZONE_META, mod?.zoneMeta, mod?.default, mod
  ].filter(Boolean)

  for (const raw of candidates) {
    if (Array.isArray(raw)) {
      const m = {}
      for (const it of raw) {
        const key = it?.id ?? it?.key ?? it?.name ?? it?.label
        if (key) m[key] = it
        if (it?.label && !m[it.label]) m[it.label] = it
      }
      if (Object.keys(m).length) return m
    } else if (raw && typeof raw === "object") {
      // If it's an object map already
      return raw
    }
  }
  return {}
}

// Detect whether anchors are 0..1 (fraction), 0..100 (percent), or pixels
function detectCoordMode(map) {
  const vals = Object.values(map)
  if (!vals.length) return "percent"
  let maxX = -Infinity, maxY = -Infinity
  for (const a of vals) {
    if (typeof a?.x !== "number" || typeof a?.y !== "number") continue
    maxX = Math.max(maxX, a.x); maxY = Math.max(maxY, a.y)
  }
  if (maxX <= 1 && maxY <= 1) return "fraction"
  if (maxX > 100 || maxY > 100) return "pixel"
  return "percent"
}

function toPercentAnchors(map, coordMode, imgW, imgH) {
  const out = {}
  for (const [id, a] of Object.entries(map)) {
    if (typeof a?.x !== "number" || typeof a?.y !== "number") continue
    let leftPct, topPct
    if (coordMode === "fraction") {
      leftPct = a.x * 100
      topPct  = a.y * 100
    } else if (coordMode === "pixel") {
      if (!imgW || !imgH) continue
      leftPct = (a.x / imgW) * 100
      topPct  = (a.y / imgH) * 100
    } else {
      leftPct = a.x
      topPct  = a.y
    }
    const label = a.label ?? id
    out[id] = { leftPct, topPct, label }
  }
  return out
}

/* --------------------- component --------------------- */

export default function GameLogger({ session, onEnd, readOnly = false }) {
  const [events, setEvents] = useState([])
  const [modal, setModal] = useState({ open: false, zone: null })

  // Load existing events for this session
  useEffect(() => {
    (async () => setEvents(await getSessionEvents(session.id)))()
  }, [session.id])

  // Normalize anchors and constants
  const rawAnchors = useMemo(() => normalizeAnchors(ZA), [])
  const zoneMeta   = useMemo(() => normalizeZoneMeta(CONST), [])

  // Coord normalization
  const coordMode = useMemo(() => detectCoordMode(rawAnchors), [rawAnchors])
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 })
  const pctAnchors = useMemo(
    () => toPercentAnchors(rawAnchors, coordMode, imgSize.w, imgSize.h),
    [rawAnchors, coordMode, imgSize]
  )

  // Helper to determine isThree using constants.js
  function lookupIsThree(zoneIdOrLabel) {
    const byId    = zoneMeta[zoneIdOrLabel]
    if (byId && typeof byId.isThree === "boolean") return !!byId.isThree
    // Try by label if our anchors gave us a label
    const a = pctAnchors[zoneIdOrLabel]
    if (a && zoneMeta[a.label] && typeof zoneMeta[a.label].isThree === "boolean") {
      return !!zoneMeta[a.label].isThree
    }
    // Fallback: not found → assume 2pt
    return false
  }

  // Tap a zone → open modal with isThree preselected from constants.js
  function onZoneTap(zoneId) {
    if (readOnly) return
    const a = pctAnchors[zoneId]
    if (!a) return
    const isThree = lookupIsThree(zoneId) || lookupIsThree(a.label)
    setModal({
      open: true,
      zone: { id: zoneId, label: a.label, isThree }
    })
  }

  // Submit from modal → add event & update UI immediately
  async function handleSubmitShot({ isThree, shotContext, contested, result }) {
    const a = pctAnchors[modal.zone.id]
    const ev = {
      id: crypto.randomUUID(),
      sessionId: session.id,
      userId: session.userId,
      ts: Date.now(),
      zoneId: modal.zone.id,
      zoneLabel: a?.label ?? modal.zone.id,
      isThree: !!isThree,
      shotContext,
      contested: !!contested,
      result, // 'make' | 'miss'
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

  // Dots to plot (green make, gray miss)
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
        onImgReady={(w, h) => setImgSize({ w, h })}
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

/* --------------------- Court --------------------- */

function Court({ onTapZone, pctAnchors, dots, onImgReady }) {
  const imgRef = useRef(null)

  useEffect(() => {
    const img = imgRef.current
    if (!img) return
    const fire = () => onImgReady(img.naturalWidth, img.naturalHeight)
    if (img.complete && img.naturalWidth) fire()
    else img.addEventListener("load", fire)
    return () => img.removeEventListener?.("load", fire)
  }, [onImgReady])

  return (
    <div className="relative mx-auto select-none" style={{ maxWidth: 520 }}>
      {/* Switch this import to your "plain" court SVG if needed */}
      <img ref={imgRef} src={courtImg} alt="court" className="w-full block" />

      {/* Click targets (invisible; show a faint ring on hover/focus) */}
      {Object.entries(pctAnchors).map(([id, a]) => (
        <button
          key={id}
          className="absolute -translate-x-1/2 -translate-y-1/2 z-20"
          style={{ left: `${a.leftPct}%`, top: `${a.topPct}%` }}
          onClick={() => onTapZone(id)}
          aria-label={a.label || id}
        >
          <span className="block h-6 w-6 rounded-full opacity-0 focus:opacity-30 hover:opacity-10 bg-black" />
        </button>
      ))}

      {/* Plotted shots */}
      {dots.map((d) => (
        <img
          key={d.key}
          src={d.url}
          alt=""
          className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10"
          style={{ left: `${d.leftPct}%`, top: `${d.topPct}%` }}
        />
      ))}
    </div>
  )
}
