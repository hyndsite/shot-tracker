// src/screens/GameLogger.jsx
import { useEffect, useMemo, useState } from 'react'
import { addGameEvent, endGame, getSessionEvents } from '../lib/game-db'
// Robust import that works for default or named exports
import * as ZA from '../constants/zoneAnchors'
import ShotModal from '../components/ShotModal'
import courtImg from '../images/court-half.svg'

/** Inline basketball SVG for dots */
const BALL_SVG = (fill) =>
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'>
     <circle cx='12' cy='12' r='9' fill='${fill}' />
     <path d='M12 3v18M3 12h18M6 6l12 12M18 6L6 18' stroke='white' stroke-width='1.5' fill='none'/>
   </svg>`

/** Normalize whatever zoneAnchors.js exports into a {id:{x,y,label,isThree}} map */
function normalizeAnchors(mod) {
  // common names first
  let raw =
    mod?.zoneAnchors ??
    mod?.ZONE_ANCHORS ??
    mod?.anchors ??
    mod?.default ??
    mod

  if (!raw) return {}

  // If the module itself is the map (namespace), try common keys inside it
  if (raw === mod) {
    raw = mod.zoneAnchors ?? mod.ZONE_ANCHORS ?? mod.anchors ?? mod.default ?? mod
  }

  // If it's already a map (has x/y on values), return as-is
  if (!Array.isArray(raw) && typeof raw === 'object') {
    // quick check for one item with x/y
    const anyVal = Object.values(raw)[0]
    if (anyVal && ('x' in anyVal) && ('y' in anyVal)) return raw
  }

  // If it's an array, convert to map by id/key/zoneId
  if (Array.isArray(raw)) {
    const m = {}
    for (const item of raw) {
      const id = item?.id ?? item?.key ?? item?.zoneId
      if (!id) continue
      m[id] = item
    }
    return m
  }

  // Fallback empty
  return {}
}

export default function GameLogger({ session, onEnd, readOnly = false }) {
  const [events, setEvents] = useState([])
  const [modal, setModal] = useState({ open: false, zone: null })

  // Normalize anchors once
  const anchors = useMemo(() => normalizeAnchors(ZA), [])

  // Load existing events for this session
  useEffect(() => {
    (async () => {
      const evs = await getSessionEvents(session.id)
      setEvents(evs)
    })()
  }, [session.id])

  // Tap a zone to open the modal (disabled in readOnly)
  function onZoneTap(zoneId) {
    if (readOnly) return
    const z = anchors[zoneId]
    if (!z) return
    setModal({
      open: true,
      zone: {
        id: zoneId,
        label: z.label ?? zoneId,
        isThree: !!z.isThree,
      },
    })
  }

  // Submit from ShotModal -> create event
  async function handleSubmitShot({ isThree, shotContext, contested, result }) {
    const z = anchors[modal.zone.id] || {}
    const ev = {
      id: crypto.randomUUID(),
      sessionId: session.id,
      userId: session.userId,
      ts: Date.now(),
      zoneId: modal.zone.id,
      zoneLabel: z.label ?? modal.zone.id,
      isThree: !!isThree,
      shotContext, // 'Catch & Shoot' | 'Off Dribble'
      contested: !!contested,
      result, // 'make' | 'miss'
    }
    await addGameEvent(ev)
    setEvents((prev) => [ev, ...prev])
  }

  async function handleEnd() {
    if (readOnly) return
    if (confirm('End the Game?')) {
      await endGame(session.id)
      onEnd?.()
    }
  }

  /** Keep your original pattern: useMemo -> const dots -> pass into Court */
  const dots = useMemo(() => {
    // Render oldest first so newer shots stack on top
    const ordered = [...events].reverse()
    return ordered
      .map((e) => {
        const a = anchors[e.zoneId]
        if (!a) return null
        const fill = e.result === 'make' ? '#16a34a' : '#9ca3af' // green for make, gray for miss
        return {
          key: e.id,
          leftPct: a.x, // percent
          topPct: a.y,  // percent
          url: 'data:image/svg+xml;utf8,' + encodeURIComponent(BALL_SVG(fill)),
        }
      })
      .filter(Boolean)
  }, [events, anchors])

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

      <Court onTapZone={onZoneTap} anchors={anchors} dots={dots} />

      <ShotModal
        open={modal.open}
        zone={modal.zone}
        onClose={() => setModal({ open: false, zone: null })}
        onSubmit={handleSubmitShot}
      />
    </div>
  )
}

/** Court: renders SVG, zone hit areas, and plotted dots */
function Court({ onTapZone, anchors, dots }) {
  return (
    <div className="relative max-w-md mx-auto select-none">
      <img src={courtImg} alt="court" className="w-full pointer-events-none" />

      {/* Zone hit areas */}
      {Object.entries(anchors).map(([id, a]) => (
        <button
          key={id}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${a.x}%`, top: `${a.y}%` }}
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
          className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ left: `${d.leftPct}%`, top: `${d.topPct}%` }}
        />
      ))}
    </div>
  )
}
