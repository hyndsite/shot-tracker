import { supabase, getUser } from './supabase'
import {
  getSessions, getEntries, getMarkers,
  addEntries, addSession, addMarker,
  getGoalSets, getGoalItems, upsertGoalSet, upsertGoalItem
} from './db'

export async function pushAllLocal() {
  const user = await getUser()
  if (!user) return { ok:false, reason:'no-user' }

  const [sessions, entries, markers, sets, items] = await Promise.all([
    getSessions(), getEntries(), getMarkers(), getGoalSets(), getGoalItems()
  ])

  for (const s of sessions) {
    await supabase.from('sessions').upsert({ id:s.id, user_id:user.id, date_iso:s.dateISO, notes:s.notes ?? null })
  }
  for (const e of entries) {
    await supabase.from('entries').upsert({
      id:e.id, user_id:user.id, session_id:e.sessionId, ts:e.ts,
      zone_id:e.zoneId, is_three:!!e.isThree, shot_type:e.shotType, subtype:e.subtype ?? null,
      pressured:!!e.pressured, attempts:e.attempts, makes:e.makes, marker_id:e.markerId ?? null
    })
  }
  for (const m of markers) {
    await supabase.from('markers').upsert({ id:m.id, user_id:user.id, session_id:m.sessionId, ts:m.ts, label:m.label })
  }

  for (const gs of sets) {
    await supabase.from('goal_sets').upsert({
      id: gs.id, user_id:user.id, name: gs.name, milestone_date: gs.milestoneDate
    })
  }
  for (const gi of items) {
    await supabase.from('goal_items').upsert({
      id: gi.id, user_id:user.id, set_id: gi.setId, type: gi.type, target: gi.target,
      comparison: gi.comparison, filter_json: gi.filter
    })
  }

  return { ok:true }
}

export async function pullAllRemote() {
  const user = await getUser()
  if (!user) return { ok:false, reason:'no-user' }

  const [sRes, eRes, mRes, gsRes, giRes] = await Promise.all([
    supabase.from('sessions').select('*').order('created_at', { ascending:false }),
    supabase.from('entries').select('*').order('created_at', { ascending:false }),
    supabase.from('markers').select('*').order('created_at', { ascending:false }),
    supabase.from('goal_sets').select('*').order('created_at', { ascending:false }),
    supabase.from('goal_items').select('*').order('created_at', { ascending:false })
  ])

  const sessions = sRes.data ?? []
  const entries  = eRes.data ?? []
  const markers  = mRes.data ?? []
  const sets     = gsRes.data ?? []
  const items    = giRes.data ?? []

  // Sessions / Entries / Markers (append if missing)
  const localSessions = new Map((await getSessions()).map(s => [s.id, s]))
  for (const s of sessions) if (!localSessions.has(s.id)) await addSession({ id:s.id, dateISO:s.date_iso, notes:s.notes ?? '' })

  const localEntries = new Map((await getEntries()).map(e => [e.id, e]))
  const newEs = []
  for (const e of entries) if (!localEntries.has(e.id)) newEs.push({
    id:e.id, sessionId:e.session_id, ts:e.ts, zoneId:e.zone_id, isThree:!!e.is_three,
    shotType:e.shot_type, subtype:e.subtype ?? 'none', pressured:!!e.pressured,
    attempts:e.attempts, makes:e.makes, markerId:e.marker_id ?? null
  })
  if (newEs.length) await addEntries(newEs)

  const localMarkers = new Map((await getMarkers()).map(m => [m.id, m]))
  for (const m of markers) if (!localMarkers.has(m.id)) await addMarker({ id:m.id, sessionId:m.session_id, ts:m.ts, label:m.label })

  // Goal sets/items
  const localSets = new Map((await getGoalSets()).map(gs => [gs.id, gs]))
  for (const gs of sets) if (!localSets.has(gs.id)) await upsertGoalSet({ id:gs.id, name:gs.name, milestoneDate:gs.milestone_date })

  const localItems = new Map((await getGoalItems()).map(gi => [gi.id, gi]))
  for (const gi of items) if (!localItems.has(gi.id)) await upsertGoalItem({
    id: gi.id, setId: gi.set_id, type: gi.type, target: Number(gi.target),
    comparison: gi.comparison, filter: gi.filter_json
  })

  return { ok:true }
}
