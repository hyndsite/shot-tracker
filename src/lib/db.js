import { get, set, update } from 'idb-keyval'

const KEYS = {
  sessions: 'st.sessions',
  entries: 'st.entries',
  markers: 'st.markers',
  goals: 'st.goals'
}

// --- Sessions & Entries ---
export async function getSessions() { return (await get(KEYS.sessions)) ?? [] }
export async function getEntries()  { return (await get(KEYS.entries)) ?? [] }

export async function addSession(s) {
  await update(KEYS.sessions, (arr = []) => [s, ...arr])
}
export async function addEntries(newEntries) {
  await update(KEYS.entries, (arr = []) => [...newEntries, ...arr])
}

// --- Markers (timestamped set markers) ---
export async function getMarkers()   { return (await get(KEYS.markers)) ?? [] }
export async function addMarker(m)   {
  await update(KEYS.markers, (arr = []) => [m, ...arr])
}

// --- Goals ---
export async function getGoals()     { return (await get(KEYS.goals)) ?? [] }
export async function upsertGoal(g)  {
  // upsert by goal.type
  await update(KEYS.goals, (arr = []) => {
    const others = arr.filter(x => x.type !== g.type)
    return [g, ...others]
  })
}

// --- Utilities ---
export async function clearAll() {
  await set(KEYS.sessions, [])
  await set(KEYS.entries, [])
  await set(KEYS.markers, [])
  await set(KEYS.goals, [])
}
