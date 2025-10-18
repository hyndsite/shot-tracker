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

export async function upsertGoalSet(gs) {
  await update(KEYS.goalSets, (arr=[]) => {
    const others = arr.filter(x => x.id !== gs.id)
    return [gs, ...others]
  })
}
export async function deleteGoalSet(setId) {
  await update(KEYS.goalSets, (arr=[]) => arr.filter(x => x.id !== setId))
  await update(KEYS.goalItems, (arr=[]) => arr.filter(x => x.setId !== setId))
}

export async function upsertGoalItem(gi) {
  await update(KEYS.goalItems, (arr=[]) => {
    const others = arr.filter(x => x.id !== gi.id)
    return [gi, ...others]
  })
}
export async function deleteGoalItem(itemId) {
  await update(KEYS.goalItems, (arr=[]) => arr.filter(x => x.id !== itemId))
}

/* Utilities */
export async function clearAll() {
  await set(KEYS.sessions, [])
  await set(KEYS.entries,  [])
  await set(KEYS.markers,  [])
  await set(KEYS.goalSets, [])
  await set(KEYS.goalItems,[])
}
