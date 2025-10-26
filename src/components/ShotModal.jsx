// src/components/ShotModal.jsx
import { useEffect, useState } from "react"
import { createPortal } from "react-dom"

export default function ShotModal({ open, zone, onClose, onSubmit }) {
  const [isThree, setIsThree] = useState(zone?.isThree ?? false)
  const [context, setContext] = useState(null) // 'Catch & Shoot' | 'Off Dribble'
  const [contested, setContested] = useState(false)

  useEffect(() => {
    if (!open) return
    setIsThree(zone?.isThree ?? false)
    setContext(null)
    setContested(false)
    // Prevent background scroll
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = "" }
  }, [open, zone])

  if (!open) return null

  const canChooseResult = !!context

  const modal = (
    <div className="modal-backdrop">
      <div className="modal-card space-y-3">
        <div className="modal-title">{zone?.label || "Zone"}</div>

        {/* Shot Type: 2-ptr / 3-ptr */}
        <div className="seg">
          <button
            className={`seg-btn ${isThree ? "" : "is-on"}`}
            onClick={() => setIsThree(false)}
            type="button"
          >
            2-ptr
          </button>
          <button
            className={`seg-btn ${isThree ? "is-on" : ""}`}
            onClick={() => setIsThree(true)}
            type="button"
          >
            3-ptr
          </button>
        </div>

        {/* Shot Context: Catch & Shoot / Off Dribble */}
        <div className="seg">
          <button
            className={`seg-btn ${context === "Catch & Shoot" ? "is-on" : ""}`}
            onClick={() => setContext("Catch & Shoot")}
            type="button"
          >
            Catch & Shoot
          </button>
          <button
            className={`seg-btn ${context === "Off Dribble" ? "is-on" : ""}`}
            onClick={() => setContext("Off Dribble")}
            type="button"
          >
            Off Dribble
          </button>
        </div>

        {/* Contested toggle (enabled only after context is chosen) */}
        <div>
          <button
            className={`seg-btn ${!context ? "is-disabled" : ""} ${contested ? "is-on" : ""}`}
            onClick={() => context && setContested(v => !v)}
            type="button"
          >
            Contested Shot
          </button>
        </div>

        {/* Make / Miss */}
        <div className="modal-actions">
          <button
            className={`btn btn-brand ${!canChooseResult ? "is-disabled opacity-50 pointer-events-none" : ""}`}
            onClick={() => { onSubmit({ isThree, shotContext: context, contested, result: "make" }); onClose() }}
            type="button"
          >
            Make
          </button>
          <button
            className={`btn btn-secondary ${!canChooseResult ? "is-disabled opacity-50 pointer-events-none" : ""}`}
            onClick={() => { onSubmit({ isThree, shotContext: context, contested, result: "miss" }); onClose() }}
            type="button"
          >
            Miss
          </button>
        </div>

        <div>
          <button className="btn btn-ghost text-sm" onClick={onClose} type="button">
            Cancel
          </button>
        </div>

        <div className="modal-note">
          Select a shot context to enable Make/Miss.
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
