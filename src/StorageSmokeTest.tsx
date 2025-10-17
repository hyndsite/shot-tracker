import { useEffect, useState } from 'react'
import { addEntries, addSession, getEntries, getSessions, clearAll } from './lib/db'
import { efg } from './types'

export default function StorageSmokeTest() {
  const [counts, setCounts] = useState({ sessions: 0, entries: 0, efg: 0 })

  const refresh = async () => {
    const sessions = await getSessions()
    const entries = await getEntries()
    const totals = entries.reduce(
      (acc, e) => {
        acc.attempts += e.attempts
        acc.makes += e.makes
        if (e.isThree) acc.threesMade += e.makes
        return acc
      },
      { attempts: 0, makes: 0, threesMade: 0 }
    )
    setCounts({ sessions: sessions.length, entries: entries.length, efg: efg(totals) })
  }

  useEffect(() => {
    refresh()
  }, [])

  const seed = async () => {
    const session = {
      id: crypto.randomUUID(),
      dateISO: new Date().toISOString(),
      notes: 'Seed session'
    }
    await addSession(session)
    const entry = {
      id: crypto.randomUUID(),
      sessionId: session.id,
      ts: Date.now(),
      zoneId: 'corner_left',
      isThree: true,
      shotType: 'catch_shoot',
      attempts: 10,
      makes: 4
    }
    await addEntries([entry])
    await refresh()
  }

  return (
    <div style={{ padding: 16, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto' }}>
      <h1>Storage Smoke Test</h1>
      <p>
        Sessions: <b>{counts.sessions}</b> | Entries: <b>{counts.entries}</b>
      </p>
      <p>
        eFG% (overall): <b>{(counts.efg * 100).toFixed(1)}%</b>
      </p>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button onClick={seed}>Add Sample Session + Entry</button>
        <button 
          onClick={async () => {
            await clearAll()
            await refresh()
          }}
        >
          Clear All
        </button>
      </div>
      <p style={{ marginTop: 12 }}>You can use this page offline. Data persists via IndexedDB.</p>
    </div>
  )
}
