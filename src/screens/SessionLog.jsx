import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import {
  addEntries, addSession, getEntries, getSessions,
  getMarkers, addMarker
} from '../lib/db'
import { ZONES, SHOT_TYPES, SUBTYPES } from '../constants'
import { efg } from '../types'

function FieldRow({ label, children }) {
  return (
    <div className="flex items-center gap-3 my-2">
      <div className="w-36 text-sm font-semibold text-slate-700">{label}</div>
      <div className="flex-1">{children}</div>
    </div>
  )
}

export default function SessionLog() {
  const [sessions, setSessions] = useState([])
  const [entries,  setEntries]  = useState([])
  const [markers,  setMarkers]  = useState([])
  const [activeSessionId, setActiveSessionId] = useState(null)

  // Form state (batch)
  const [zoneId, setZoneId]       = useState('corner_left')
  const [shotType, setShotType]   = useState('catch_shoot')
  const [subtype, setSubtype]     = useState('none')
  const [pressured, setPressured] = useState(false)
  const [attempts, setAttempts]   = useState(10)
  const [makes, setMakes]         = useState(4)

  const todayISO = dayjs().format('YYYY-MM-DD')

  useEffect(() => {
    const load = async () => {
      const s = await getSessions()
      const e = await getEntries()
      const m = await getMarkers()
      setSessions(s); setEntries(e); setMarkers(m)
      const today = s.find(ss => ss.dateISO.startsWith(todayISO))
      if (today) setActiveSessionId(today.id)
    }
    load()
  }, [])

  const activeSession = useMemo(
    () => sessions.find(s => s.id === activeSessionId) || null,
    [sessions, activeSessionId]
  )

  const sessionsSorted = useMemo(
    () => [...sessions].sort((a,b)=> dayjs(b.dateISO).valueOf() - dayjs(a.dateISO).valueOf()),
    [sessions]
  )

  const todaysEntries = useMemo(() => {
    if (!sessions.length) return []
    const todayIds = new Set(
      sessions.filter(s => s.dateISO.startsWith(todayISO)).map(s => s.id)
    )
    return entries.filter(e => todayIds.has(e.sessionId))
  }, [entries, sessions, todayISO])

  const totalsToday = useMemo(() =>
    todaysEntries.reduce((acc,e) => {
      acc.attempts += e.attempts
      acc.makes    += e.makes
      if (e.isThree) acc.threesMade += e.makes
      return acc
    }, { attempts:0, makes:0, threesMade:0 })
  , [todaysEntries])

  const activeZoneIsThree = useMemo(() => {
    if (zoneId === 'free_throw') return false
    const z = ZONES.find(z => z.id === zoneId)
    return z ? z.isThree : false
  }, [zoneId])

  // --- Session controls
  const createNewSession = async () => {
    const newSession = { id: crypto.randomUUID(), dateISO: new Date().toISOString(), notes: '' }
    await addSession(newSession)
    setSessions(prev => [newSession, ...prev])
    setActiveSessionId(newSession.id)
  }
  const switchSession = (id) => setActiveSessionId(id || null)
  const endSession = () => setActiveSessionId(null)
  const ensureSession = async () => {
    if (activeSessionId) return activeSessionId
    await createNewSession()
    return activeSessionId
  }

  // --- Quick actions (form-only, non-persistent)
  const onPlusAttempts = () => setAttempts(a => Number(a) + 10)
  const onPlusMake     = () => setMakes(m => Number(m) + 1)

  // --- Marker (immediate persistence)
  const onMarkSet = async () => {
    const sid = await ensureSession()
    const m = { id: crypto.randomUUID(), sessionId: sid, ts: Date.now(), label: 'Set' }
    await addMarker(m)
    setMarkers(prev => [m, ...prev])
  }

  // --- Save batch (persistence)
  const addBatch = async (andReset = false) => {
    const sid = await ensureSession()
    const entry = {
      id: crypto.randomUUID(),
      sessionId: sid,
      ts: Date.now(),
      zoneId,
      isThree: shotType === 'free_throw' ? false : activeZoneIsThree,
      shotType,
      subtype: shotType === 'off_dribble' ? subtype : 'none',
      pressured,
      attempts: Number(attempts),
      makes: Number(makes)
    }
    await addEntries([entry])
    setEntries(prev => [entry, ...prev])
    if (andReset) { setAttempts(10); setMakes(0) }
    // You can auto-push to Supabase here if desired
  }

  return (
    <div className="mx-auto max-w-3xl pb-28 px-4 sm:px-6 lg:px-0 font-[system-ui]">
      {/* Header */}
      <div className="py-4">
        <h2 className="text-xl font-bold text-slate-900">Session & Log</h2>
        <p className="text-sm text-slate-500">Record drills quickly; save batches for analytics and goals.</p>
      </div>

      {/* Session Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 mb-4">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button onClick={createNewSession}
                  className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700">
            + New Session (Today)
          </button>

          <label className="flex items-center gap-2 text-sm">
            <span className="font-semibold text-slate-700">Switch:</span>
            <select
              value={activeSessionId || ''}
              onChange={(e)=>switchSession(e.target.value || null)}
              className="w-full max-w-xs border border-slate-300 bg-white text-slate-900 rounded-md px-2 py-1"
            >
              <option value="">— none —</option>
              {sessionsSorted.map(s => (
                <option key={s.id} value={s.id}>
                  {dayjs(s.dateISO).format('MMM D, YYYY · HH:mm')}
                </option>
              ))}
            </select>
          </label>

          <button onClick={endSession} disabled={!activeSessionId}
                  className="px-3 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium disabled:opacity-50">
            End Session
          </button>
        </div>

        <div className="mt-2 text-sm text-slate-600">
          {activeSession
            ? <>Active: <b>{dayjs(activeSession.dateISO).format('MMM D, YYYY · HH:mm')}</b></>
            : <>No active session selected.</>}
        </div>
      </div>

      {/* Today Summary */}
      <div className="bg-slate-50 rounded-lg px-3 py-2 text-sm mb-4">
        <b>Today:</b> eFG% <b>{(efg(totalsToday)*100).toFixed(1)}%</b> · Attempts <b>{totalsToday.attempts}</b> · Makes <b>{totalsToday.makes}</b>
      </div>

      {/* Batch Form */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <FieldRow label="Zone">
          <select value={zoneId} onChange={e=>setZoneId(e.target.value)}
                  className="w-full max-w-xs border border-slate-300 bg-white text-slate-900 rounded-md px-2 py-1">
            {ZONES.map(z => <option key={z.id} value={z.id}>{z.label}</option>)}
          </select>
        </FieldRow>

        <FieldRow label="Shot Type">
          <select value={shotType} onChange={e=>setShotType(e.target.value)}
                  className="w-full max-w-xs border border-slate-300 bg-white text-slate-900 rounded-md px-2 py-1">
            {SHOT_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </FieldRow>

        {shotType === 'off_dribble' && (
          <FieldRow label="Subtype">
            <select value={subtype} onChange={e=>setSubtype(e.target.value)}
                    className="w-full max-w-xs border border-slate-300 bg-white text-slate-900 rounded-md px-2 py-1">
              {SUBTYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </FieldRow>
        )}

        <FieldRow label="Pressured">
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={pressured} onChange={e=>setPressured(e.target.checked)} />
            <span>Mark as pressured</span>
          </label>
        </FieldRow>

        <FieldRow label="Attempts">
          <div className="flex items-center gap-2">
            <input type="number" min="0" value={attempts}
                   onChange={e=>setAttempts(e.target.value)}
                   className="w-28 border border-slate-300 rounded-md px-2 py-1" />
            <button onClick={onPlusAttempts}
                    className="px-3 py-1.5 rounded-md bg-slate-100 text-slate-800 text-sm hover:bg-slate-200">
              +10 Attempts
            </button>
          </div>
        </FieldRow>

        <FieldRow label="Makes">
          <div className="flex items-center gap-2">
            <input type="number" min="0" value={makes}
                   onChange={e=>setMakes(e.target.value)}
                   className="w-28 border border-slate-300 rounded-md px-2 py-1" />
            <button onClick={onPlusMake}
                    className="px-3 py-1.5 rounded-md bg-slate-100 text-slate-800 text-sm hover:bg-slate-200">
              +Make
            </button>
          </div>
        </FieldRow>

        <div className="flex gap-2 mt-4">
          <button onClick={() => addBatch(true)}
                  className="btn btn-primary">
            Save & Add Another
          </button>
          <button onClick={() => addBatch(false)}
                  className="btn btn-secondary">
            Save
          </button>
          <button onClick={onMarkSet}
                  className="btn btn-accent ml-auto">
            Mark Set
          </button>
        </div>
      </div>

      {/* Today’s Entries */}
      <div className="mt-6">
        <h3 className="text-base font-semibold text-slate-900">Today’s Entries</h3>
        <p className="text-xs text-slate-500">(Most recent first)</p>
        <ul className="mt-2 list-disc pl-5">
          {todaysEntries.map(e => {
            const z = ZONES.find(z => z.id === e.zoneId)
            const st = SHOT_TYPES.find(t => t.id === e.shotType)
            const sub = SUBTYPES.find(s => s.id === e.subtype) || { label:'—' }
            return (
              <li key={e.id} className="my-1 text-sm text-slate-700">
                {dayjs(e.ts).format('HH:mm')} · {z?.label} · {st?.label}
                {e.shotType==='off_dribble' ? ` (${sub.label})` : ''}
                {e.pressured ? ' · Pressured' : ''} — <b>{e.makes}/{e.attempts}</b>
              </li>
            )
          })}
          {todaysEntries.length === 0 && <li className="text-sm text-slate-500">No entries yet.</li>}
        </ul>
      </div>

      {/* Today’s Markers */}
      <div className="mt-6">
        <h3 className="text-base font-semibold text-slate-900">Today’s Markers</h3>
        <ul className="mt-2 list-disc pl-5">
          {markers
            .filter(m => activeSession && m.sessionId === activeSession.id)
            .sort((a,b)=> b.ts - a.ts)
            .map(m => (
              <li key={m.id} className="my-1 text-sm text-slate-700">
                {dayjs(m.ts).format('HH:mm')} · {m.label}
              </li>
            ))
          }
          {(!markers.some(m => activeSession && m.sessionId === activeSession.id)) &&
            <li className="text-sm text-slate-500">No markers yet.</li>}
        </ul>
      </div>

      {/* Sticky Quick Bar */}
      <div className="fixed bottom-3 left-0 right-0 flex justify-center px-3">
        <div className="w-full max-w-3xl rounded-2xl shadow-lg border border-slate-200 bg-white p-3 flex items-center gap-2">
          <button onClick={onPlusAttempts}
                  className="btn-quiet">
            +10 Attempts
          </button>
          <button onClick={onPlusMake}
                  className="btn-quiet">
            +Make
          </button>
          <button onClick={onMarkSet}
                  className="flex-1 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
            Mark Set
          </button>
        </div>
      </div>
    </div>
  )
}
