import { useState } from 'react'

// simple feedback toast
function Toast({ message }) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 90,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
        zIndex: 100
      }}
    >
      <div
        style={{
          background: '#0f172a',
          color: 'white',
          padding: '8px 16px',
          borderRadius: 8,
          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
          fontSize: 14,
          opacity: 0.95
        }}
      >
        {message}
      </div>
    </div>
  )
}

export default function LiveLiteBar({ onMarkSet, onPlusAttempts, onPlusMake }) {
  const [toast, setToast] = useState(null)

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 1000)
  }

  // vibrate short (mobile)
  const vibe = () => {
    if (navigator.vibrate) navigator.vibrate(30)
  }

  const clickHandler = async (fn, msg) => {
    vibe()
    fn && (await fn())
    showToast(msg)
  }

  const wrap = {
    position: 'sticky',
    bottom: 0,
    zIndex: 20,
    background: '#0f172a',
    padding: 8,
    boxShadow: '0 -2px 8px rgba(0,0,0,0.25)'
  }

  const row = {
    display: 'flex',
    gap: 8,
    justifyContent: 'space-between'
  }

  const btnBase = {
    flex: 1,
    padding: '14px 10px',
    border: 'none',
    borderRadius: 12,
    color: 'white',
    fontWeight: 700,
    fontSize: 16,
    transition: 'all 0.12s ease-in-out',
    cursor: 'pointer',
    userSelect: 'none',
    touchAction: 'manipulation'
  }

  const colors = {
    mark: '#64748b',
    attempts: '#22c55e',
    make: '#0ea5e9'
  }

  // helper to make press animation
  const makeBtn = (label, color, fn, msg) => (
    <button
      key={label}
      onClick={() => clickHandler(fn, msg)}
      style={btnBase}
      onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.96)')}
      onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      onTouchStart={(e) => (e.currentTarget.style.transform = 'scale(0.96)')}
      onTouchEnd={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = shade(color, -10))}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = color)}
      style={{ ...btnBase, background: color }}
    >
      {label}
    </button>
  )

  // color adjust helper
  function shade(hex, percent) {
    let R = parseInt(hex.substring(1, 3), 16)
    let G = parseInt(hex.substring(3, 5), 16)
    let B = parseInt(hex.substring(5, 7), 16)
    R = parseInt((R * (100 + percent)) / 100)
    G = parseInt((G * (100 + percent)) / 100)
    B = parseInt((B * (100 + percent)) / 100)
    R = R < 255 ? R : 255
    G = G < 255 ? G : 255
    B = B < 255 ? B : 255
    const RR = R.toString(16).padStart(2, '0')
    const GG = G.toString(16).padStart(2, '0')
    const BB = B.toString(16).padStart(2, '0')
    return `#${RR}${GG}${BB}`
  }

  return (
    <>
      <div style={wrap}>
        <div style={row}>
          {makeBtn('Mark Set', colors.mark, onMarkSet, 'Marked')}
          {makeBtn('+10 Attempts', colors.attempts, onPlusAttempts, '+10 Attempts')}
          {makeBtn('+Make', colors.make, onPlusMake, '+1 Make')}
        </div>
      </div>
      {toast && <Toast message={toast} />}
    </>
  )
}
