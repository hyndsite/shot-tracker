import { supabase, getUser } from './supabase'
import { getSessions, getEntries, getMarkers, getGoals, addEntries, addSession, addMarker, upsertGoal } from './db'

export async function pushAllLocal() {
  const user = await getUser()
  if (!user) return { ok:false, reason:'no-user' }

  const [sessions, entries, markers, goals] = await Promise.all([
    getSessions(), getEntries(), getMarkers(), getGoals()
  ])

  // Upsert via insert with 'on conflict' (client lib will do it row-by-row)
  // Sessions
  for (const s of sessions) {
    await supabase.from('sessions').upsert({
      id: s.id, user_id: user.id, date_iso: s.dateISO, notes: s.notes ?? null
    })
  }

  // Entries
  for (const e of entries) {
    await supabase.from('entries').upsert({
      id: e.id,
      user_id: user.id,
      session_id: e.sessionId,
      ts: e.ts,
      zone_id: e.zoneId,
      is_three: !!e.isThree,
      shot_type: e.shotType,
      subtype: e.subtype ?? null,
      pressured: !!e.pressured,
      attempts: e.attempts,
      makes: e.makes,
      marker_id: e.markerId ?? null
    })
  }

  // Markers
  for (const m of markers) {
    await supabase.from('markers').upsert({
      id: m.id, user_id: user.id, session_id: m.sessionId, ts: m.ts, label: m.label
    })
  }

  // Goals (1 row per type)
  for (const g of goals) {
    await supabase.from('goals').upsert({
      type: g.type, user_id: user.id, target: g.target
    })
  }

  return { ok:true }
}

export async function pullAllRemote() {
  const user = await getUser()
  if (!user) return { ok:false, reason:'no-user' }

  // Pull everything and merge (dedupe by id)
  const [sRes, eRes, mRes, gRes] = await Promise.all([
    supabase.from('sessions').select('*').order('created_at', { ascending:false }),
    supabase.from('entries').select('*').order('created_at', { ascending:false }),
    supabase.from('markers').select('*').order('created_at', { ascending:false }),
    supabase.from('goals').select('*')
  ])
  const sessions = sRes.data ?? []
  const entries  = eRes.data ?? []
  const markers  = mRes.data ?? []
  const goals    = gRes.data ?? []

  // Merge into local if missing
  // (Append-only makes this straightforward; no edits to resolve)
  const localSessionIds = new Set((await getSessions()).map(s => s.id))
  for (const s of sessions) {
    if (!localSessionIds.has(s.id)) {
      await addSession({ id: s.id, dateISO: s.date_iso, notes: s.notes ?? '' })
    }
  }

  const localEntryIds = new Set((await getEntries()).map(e => e.id))
  const newEntries = []
  for (const e of entries) {
    if (!localEntryIds.has(e.id)) {
      newEntries.push({
        id: e.id,
        sessionId: e.session_id,
        ts: e.ts,
        zoneId: e.zone_id,
        isThree: !!e.is_three,
        shotType: e.shot_type,
        subtype: e.subtype ?? 'none',
        pressured: !!e.pressured,
        attempts: e.attempts,
        makes: e.makes,
        markerId: e.marker_id ?? null
      })
    }
  }
  if (newEntries.length) await addEntries(newEntries)

  const localMarkerIds = new Set((await getMarkers()).map(m => m.id))
  for (const m of markers) {
    if (!localMarkerIds.has(m.id)) {
      await addMarker({ id: m.id, sessionId: m.session_id, ts: m.ts, label: m.label })
    }
  }

  const localGoals = await getGoals()
  const have = new Set(localGoals.map(g => g.type))
  for (const g of goals) {
    if (!have.has(g.type)) {
      await upsertGoal({ type: g.type, target: Number(g.target) })
    }
  }

  return { ok:true }
}
