import { get, set, update } from 'idb-keyval'

const KEYS = {
  sessions: 'st.game.sessions',
  events:   'st.game.events',
}

export async function getGameSessions() { return (await get(KEYS.sessions)) ?? [] }
export async function getGameEvents()   { return (await get(KEYS.events))   ?? [] }

export async function addGameSession(s) {
  await update(KEYS.sessions, (arr=[]) => [s, ...arr.filter(x => x.id !== s.id)])
  return s
}
export async function updateGameSession(id, patch) {
  let updated
  await update(KEYS.sessions, (arr=[]) => {
    const next = arr.map(s => s.id === id ? (updated = { ...s, ...patch, updatedAt: Date.now() }) : s)
    return next
  })
  return updated
}

export async function addGameEvent(ev) {
  await update(KEYS.events, (arr=[]) => [ev, ...arr])
  return ev
}

export async function getActiveGameForUser(userId) {
  const sessions = await getGameSessions()
  return sessions.find(s => s.userId === userId && s.status === 'active') || null
}

export async function getSessionEvents(sessionId) {
  const evs = await getGameEvents()
  return evs.filter(e => e.sessionId === sessionId)
}

export async function endGame(sessionId) {
  return updateGameSession(sessionId, { status: 'completed' })
}
