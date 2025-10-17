import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { addEntries, addSession, getEntries, getSessions, getMarkers, addMarker } from './lib/db'
import { ZONES, SHOT_TYPES, SUBTYPES } from './constants'
import { efg } from './types'
import LiveLiteBar from './LiveLiteBar'

function LabeledRow({ label, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0' }}>
      <div style={{ width: 120, fontWeight: 600 }}>{label}</div>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  )
}

export default function BatchWizard() {
  const [sessions, setSessions] = useState([])
  const [entries, setEntries] = useState([])
  const [markers, setMarkers] = useState([])
  const [activeSessionId, setActiveSessionId] = useState(null)

  // sticky form state
  const [zoneId, setZoneId] = useState('corner_left')
  const [shotType, setShotType] = useState('catch_shoot')
  const [subtype, setSubtype] = useState('none')
  const [pressured, setPressured] = useState(false)
  const [attempts, setAttempts] = useState(10)
  const [makes, setMakes] = useState(4)

  const todayISO = dayjs().format('YYYY-MM-DD')

  useEffect(() => {
    const load = async () => {
      const s = await getSessions()
      const e = await getEntries()
      const m = await getMarkers()
      setSessions(s)
      setEntries(e)
      setMarkers(m)
      const todaySession = s.find((ss) => ss.dateISO.startsWith(todayISO))
      if (todaySession) setActiveSessionId(todaySession.id)
    }
    load()
  }, [])

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeSessionId) || null,
    [sessions, activeSessionId]
  )

  const todaysEntries = useMemo(
    () =>
      entries.filter((e) =>
        sessions.find((s) => s.id === e.sessionId && s.dateISO.startsWith(todayISO))
      ),
    [entries, sessions, todayISO]
  )

  const totals = useMemo(() => {
    const t = todaysEntries.reduce(
      (acc, e) => {
        acc.attempts += e.attempts
        acc.makes += e.makes
        if (e.isThree) acc.threesMade += e.makes
        return acc
      },
      { attempts: 0, makes: 0, threesMade: 0 }
    )
    return t
  }, [todaysEntries])

  const activeZoneIsThree = useMemo(() => {
    if (zoneId === 'free_throw') return false
    const z = ZONES.find((z) => z.id === zoneId)
    return z ? z.isThree : false
  }, [zoneId])

  const ensureSession = async () => {
    if (activeSessionId) return activeSessionId
    const newSession = {
      id: crypto.randomUUID(),
      dateISO: new Date().toISOString(),
      notes: ''
    }
    await addSession(newSession)
    setSessions((prev) => [newSession, ...prev])
    setActiveSessionId(newSession.id)
    return newSession.id
  }

  // --- Live Lite handlers ---
  const onMarkSet = async () => {
    const sid = await ensureSession()
    const m = { id: crypto.randomUUID(), sessionId: sid, ts: Date.now(), label: 'Set' }
    await addMarker(m)
    setMarkers((prev) => [m, ...prev])
  }

  const onPlusAttempts = () => setAttempts((a) => Number(a) + 10)
  const onPlusMake = () => setMakes((m) => Number(m) + 1)

  const addBatch = async (andReset = false) => {
    const sid = await ensureSession()
    const newEntry = {
      id: crypto.randomUUID(),
      sessionId: sid,
      ts: Date.now(),
      zoneId,
      isThree:
        shotType === 'free_throw'
          ? false
          : activeZoneIsThree || shotType !== 'catch_shoot'
          ? activeZoneIsThree
          : activeZoneIsThree,
      shotType,
      subtype: shotType === 'off_dribble' ? subtype : 'none',
      pressured,
      attempts: Number(attempts),
      makes: Number(makes)
    }
    await addEntries([newEntry])
    setEntries((prev) => [newEntry, ...prev])
    if (andReset) {
      setAttempts(10)
      setMakes(0)
    }
  }

  const startSession = async () => {
    if (activeSessionId) return
    await ensureSession()
  }

  return (
    <div
      style={{
        padding: 16,
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto',
        maxWidth: 720,
        margin: '0 auto',
        paddingBottom: 80 // make room for sticky footer
      }}
    >
      <h2 style={{ marginBottom: 8 }}>Batch Log</h2>

      {!activeSession && (
        <button onClick={startSession} style={{ padding: '10px 14px', borderRadius: 8 }}>
          Start New Session (Today)
        </button>
      )}
      {activeSession && (
        <div style={{ margin: '8px 0', padding: 10, background: '#f6f7fb', borderRadius: 8 }}>
          <b>Active Session:</b> {dayjs(activeSession.dateISO).format('MMM D, YYYY')} · Entries today:{' '}
          {todaysEntries.length} · eFG% today:{' '}
          <b>{(efg(totals) * 100).toFixed(1)}%</b> (A:{totals.attempts} · M:{totals.makes})
        </div>
      )}

      <div style={{ marginTop: 12, padding: 12, border: '1px solid #e5e7eb', borderRadius: 10 }}>
        <LabeledRow label="Zone">
          <select value={zoneId} onChange={(e) => setZoneId(e.target.value)}>
            {ZONES.map((z) => (
              <option key={z.id} value={z.id}>
                {z.label}
              </option>
            ))}
          </select>
        </LabeledRow>

        <LabeledRow label="Shot Type">
          <select value={shotType} onChange={(e) => setShotType(e.target.value)}>
            {SHOT_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </LabeledRow>

        {shotType === 'off_dribble' && (
          <LabeledRow label="Subtype">
            <select value={subtype} onChange={(e) => setSubtype(e.target.value)}>
              {SUBTYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </LabeledRow>
        )}

        <LabeledRow label="Pressured">
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={pressured}
              onChange={(e) => setPressured(e.target.checked)}
            />
            Mark as pressured
          </label>
        </LabeledRow>

        <LabeledRow label="Attempts">
          <input
            type="number"
            min="0"
            value={attempts}
            onChange={(e) => setAttempts(e.target.value)}
          />
        </LabeledRow>

        <LabeledRow label="Makes">
          <input type="number" min="0" value={makes} onChange={(e) => setMakes(e.target.value)} />
        </LabeledRow>

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button onClick={() => addBatch(true)} style={{ padding: '10px 14px', borderRadius: 8 }}>
            Save & Add Another
          </button>
          <button onClick={() => addBatch(false)} style={{ padding: '10px 14px', borderRadius: 8 }}>
            Save
          </button>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <h3>Today’s Entries</h3>
        <div style={{ fontSize: 14, color: '#555' }}>(Most recent first)</div>
        <ul style={{ marginTop: 8, paddingLeft: 18 }}>
          {todaysEntries.map((e) => {
            const z = ZONES.find((z) => z.id === e.zoneId)
            const st = SHOT_TYPES.find((t) => t.id === e.shotType)
            const sub = SUBTYPES.find((s) => s.id === e.subtype) || { label: '—' }
            return (
              <li key={e.id} style={{ margin: '6px 0' }}>
                {dayjs(e.ts).format('HH:mm')} · {z?.label} · {st?.label}
                {e.shotType === 'off_dribble' ? ` (${sub.label})` : ''}
                {e.pressured ? ' · Pressured' : ''} — {e.makes}/{e.attempts}
              </li>
            )
          })}
          {todaysEntries.length === 0 && <li>No entries yet.</li>}
        </ul>
      </div>

      <div style={{ marginTop: 16 }}>
        <h3>Today’s Markers</h3>
        <ul style={{ marginTop: 8, paddingLeft: 18 }}>
          {markers
            .filter((m) => activeSession && m.sessionId === activeSession.id)
            .sort((a, b) => b.ts - a.ts)
            .map((m) => (
              <li key={m.id}>
                {dayjs(m.ts).format('HH:mm')} · {m.label}
              </li>
            ))}
          {!markers.some((m) => activeSession && m.sessionId === activeSession.id) && (
            <li>No markers yet.</li>
          )}
        </ul>
      </div>

      {/* --- Sticky live footer --- */}
      <LiveLiteBar
        onMarkSet={onMarkSet}
        onPlusAttempts={onPlusAttempts}
        onPlusMake={onPlusMake}
      />
    </div>
  )
}
