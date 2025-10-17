import { useEffect, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'

export default function PWAUpdateBanner() {
  const [needRefresh, setNeedRefresh] = useState(false)
  const [waitingSW, setWaitingSW] = useState(null)

  useEffect(() => {
    const updateSW = registerSW({
      onNeedRefresh(sw) {
        setWaitingSW(sw)
        setNeedRefresh(true)
      },
      onOfflineReady() {
        console.log('App ready to work offline')
      }
    })
    return () => updateSW()
  }, [])

  const doRefresh = () => {
    if (waitingSW) {
      waitingSW.postMessage({ type: 'SKIP_WAITING' })
      setNeedRefresh(false)
      // allow SW to take control, then reload
      waitingSW.addEventListener('statechange', e => {
        if (e.target.state === 'activated') window.location.reload()
      })
    }
  }

  if (!needRefresh) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <div
        style={{
          background: '#0f172a',
          color: 'white',
          padding: '12px 20px',
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}
      >
        <span>🔄 A new version is available.</span>
        <button
          onClick={doRefresh}
          style={{
            background: '#22c55e',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            padding: '6px 10px',
            fontWeight: 600,
          }}
        >
          Refresh
        </button>
      </div>
    </div>
  )
}
