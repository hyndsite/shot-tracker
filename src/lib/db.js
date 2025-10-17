import { get, set, update } from 'idb-keyval'

const KEYS = {
  sessions: 'st.sessions',
  entries: 'st.entries'
}

export async function getSessions() {
  return (await get(KEYS.sessions)) ?? []
}

export async function getEntries() {
  return (await get(KEYS.entries)) ?? []
}

export async function addSession(s) {
  await update(KEYS.sessions, (arr = []) => [s, ...arr])
}

export async function addEntries(newEntries) {
  await update(KEYS.entries, (arr = []) => [...newEntries, ...arr])
}

export async function clearAll() {
  await set(KEYS.sessions, [])
  await set(KEYS.entries, [])
}
