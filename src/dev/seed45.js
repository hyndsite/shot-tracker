// src/dev/seed45.js
import dayjs from 'dayjs'
import { ZONES } from '../constants'
import { ZONE_ANCHORS } from '../constants/zoneAnchors'
import { addSession, addEntries, addMarker } from '../lib/db'
import { pushAllLocal } from '../lib/sync'

// pick helper
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
const rnd  = (a, b) => Math.floor(a + Math.random() * (b - a + 1))

// build zone pools from current config/anchors (exclude FT for normal batches)
const ZONES_BY_ID = Object.fromEntries(ZONES.map(z => [z.id, z]))
const NON_FT_ZONE_IDS = Object.keys(ZONE_ANCHORS)
  .filter(id => id !== 'free_throw' && ZONES_BY_ID[id])

/**
 * Creates one batch object (entry)
 */
function makeBatch(sessionId, t, { zoneId, shotType, pressured=false, attempts, makes }) {
  const isThree = !!ZONES_BY_ID[zoneId]?.isThree
  return {
    id: crypto.randomUUID(),
    sessionId,
    ts: t,               // ms
    zoneId,
    shotType,            // 'catch_shoot' | 'off_dribble' | 'free_throw'
    subtype: 'none',
    pressured,
    attempts,
    makes,
    isThree
  }
}

/**
 * Seed 45 days of data (1 session per day by default).
 * Options:
 *   days: number (default 45)
 *   sessionsPerDay: number (default 1)
 *   push: boolean (default false) → push to Supabase after seeding
 */
export async function estSeed45({ days = 45, sessionsPerDay = 1, push = false } = {}) {
  const today = dayjs().startOf('day')
  const sessionsCreated = []

  for (let d = days - 1; d >= 0; d--) {
    const dayStart = today.subtract(d, 'day').add(18, 'hour') // 6pm workouts
    for (let s = 0; s < sessionsPerDay; s++) {
      const session = {
        id: crypto.randomUUID(),
        dateISO: dayStart.add(s, 'hour').toISOString(),
        notes: 'Auto-seeded'
      }
      await addSession(session)
      sessionsCreated.push(session.id)

      const t0 = dayStart.valueOf() + s * 60 * 60 * 1000

      // 4–6 batches per session across your current zones
      const batchCount = rnd(4, 6)
      const entries = []
      for (let i = 0; i < batchCount; i++) {
        const zoneId = pick(NON_FT_ZONE_IDS)
        const shotType = Math.random() < 0.6 ? 'catch_shoot' : 'off_dribble'
        const pressured = Math.random() < 0.25
        const attempts = rnd(12, 25)

        // baseline accuracies (tweak as you like)
        const baseAcc =
          ZONES_BY_ID[zoneId]?.isThree ? 0.34 :
          zoneId === 'paint' ? 0.62 :
          0.48

        // apply pressured penalty / off-dribble penalty small random
        const adj = baseAcc + (shotType === 'off_dribble' ? -0.03 : 0) + (pressured ? -0.04 : 0) + (Math.random() * 0.06 - 0.03)
        const makes = Math.max(0, Math.min(attempts, Math.round(attempts * adj)))

        entries.push(makeBatch(session.id, t0 + i * 6 * 60 * 1000, {
          zoneId, shotType, pressured, attempts, makes
        }))
      }

      // Add a FT batch each session
      const ftAttempts = rnd(10, 25)
      const ftMakes = Math.round(ftAttempts * (0.78 + (Math.random() * 0.06 - 0.03)))
      entries.push(makeBatch(session.id, t0 + batchCount * 6 * 60 * 1000, {
        zoneId: 'free_throw',
        shotType: 'free_throw',
        pressured: false,
        attempts: ftAttempts,
        makes: ftMakes
      }))

      await addEntries(entries)

      // Markers
      await addMarker({ id: crypto.randomUUID(), sessionId: session.id, ts: t0, label: 'Warmup' })
      await addMarker({ id: crypto.randomUUID(), sessionId: session.id, ts: t0 + (batchCount * 3 * 60 * 1000), label: 'Drill Switch' })
      await addMarker({ id: crypto.randomUUID(), sessionId: session.id, ts: t0 + (batchCount * 6 * 60 * 1000) + 5 * 60 * 1000, label: 'Session End' })
    }
  }

  if (push) {
    const res = await pushAllLocal()
    return { ok: res?.ok ?? true, sessions: sessionsCreated.length, pushed: true }
  }
  return { ok: true, sessions: sessionsCreated.length, pushed: false }
}

// Convenience global hook for console usage
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.estSeed45 = estSeed45
}
