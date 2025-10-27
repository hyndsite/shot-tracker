import { get, set, update } from 'idb-keyval'

const KEYS = {
  sessions: 'st.sessions',
  entries:  'st.entries',
  markers:  'st.markers',
  goalSets: 'st.goalSets',   // [{id,name,milestoneDate}]
  goalItems:'st.goalItems'   // [{id,setId,type,target,comparison,filter}]
}

/* Sessions & Entries & Markers (unchanged core) */
export async function getSessions() { return (await get(KEYS.sessions)) ?? [] }
export async function getEntries()  { return (await get(KEYS.entries))  ?? [] }
export async function getMarkers()  { return (await get(KEYS.markers))  ?? [] }

export async function addSession(s) {
  await update(KEYS.sessions, (arr=[]) => [s, ...arr])
}
export async function addEntries(newEntries) {
  await update(KEYS.entries, (arr=[]) => [...newEntries, ...arr])
}
export async function addMarker(m) {
  await update(KEYS.markers, (arr=[]) => [m, ...arr])
}

/* Goal Sets */
export async function getGoalSets()    { return (await get(KEYS.goalSets)) ?? [] }
export async function getGoalItems()   { return (await get(KEYS.goalItems)) ?? [] }

export async function upsertGoalSet(set) {
  // set: { id?, name, milestoneDateISO, mode: 'practice'|'game' }
  const incoming = { ...set }
  if (!incoming.id) incoming.id = crypto.randomUUID()
  if (!incoming.mode) incoming.mode = 'practice' // default safeguard
  await update(KEYS.goalSets, (arr = []) => {
    const without = arr.filter(x => x.id !== incoming.id)
    return [incoming, ...without] // newest first
  })
  return incoming
}

export async function deleteGoalSet(id) {
  await update(KEYS.goalSets, (arr = []) => arr.filter(s => s.id !== id))
  // Optionally cascade remove items in this set:
  await update(KEYS.goalItems, (arr = []) => arr.filter(it => it.setId !== id))
}

export async function upsertGoalItem(item) {
  // item: { id?, setId, type, target, comparison?, filter? }
  const incoming = { comparison: 'greater_equal', ...item }
  if (!incoming.id) incoming.id = crypto.randomUUID()
  await update(KEYS.goalItems, (arr = []) => {
    const without = arr.filter(x => x.id !== incoming.id)
    return [incoming, ...without]
  })
  return incoming
}

export async function deleteGoalItem(itemId) {
  await update(KEYS.goalItems, (arr = []) => arr.filter(x => x.id !== itemId))
}

// --- One-time migration: add 'mode' to existing sets if missing ---
export async function migrateGoalSets_AddMode() {
  await update(KEYS.goalSets, (arr = []) =>
    arr.map(s => (s.mode ? s : { ...s, mode: 'practice' }))
  )
}

/* Utilities */
export async function clearAll() {
  await set(KEYS.sessions, [])
  await set(KEYS.entries,  [])
  await set(KEYS.markers,  [])
  await set(KEYS.goalSets, [])
  await set(KEYS.goalItems,[])
}
