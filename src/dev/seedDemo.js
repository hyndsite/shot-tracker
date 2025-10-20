// src/dev/seedDemo.js
import dayjs from 'dayjs'
import { addSession, addEntries, addMarker, upsertGoalSet, upsertGoalItem } from '../lib/db'
import { pushAllLocal } from '../lib/sync'
import { ZONES, SHOT_TYPES, SUBTYPES } from '../constants'

const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
const pick = (arr) => arr[rnd(0, arr.length - 1)]

function makeBatch(sessionId, when, { zoneId, shotType, subtype = 'none', pressured = false, attempts, makes }) {
  return {
    id: crypto.randomUUID(),
    sessionId,
    ts: when.valueOf(),
    zoneId,
    isThree: zoneId !== 'free_throw' && (ZONES.find(z => z.id === zoneId)?.isThree || false),
    shotType,
    subtype,
    pressured,
    attempts,
    makes,
  }
}

async function seedSessions({ startMondayISO, weeks = 5, sessionsPerWeek = 4 }) {
  // Start on provided Monday or the most recent Monday
  const start = startMondayISO
    ? dayjs(startMondayISO)
    : dayjs().startOf('week').add(1, 'day') // Monday

  const daysFor4 = [0, 1, 3, 4] // Mon, Tue, Thu, Fri
  const allEntries = []

  for (let w = 0; w < weeks; w++) {
    for (let i = 0; i < sessionsPerWeek; i++) {
      const d = start.add(w, 'week').add(daysFor4[i], 'day').hour(rnd(7, 19)).minute(rnd(0, 59)).second(0)
      const session = { id: crypto.randomUUID(), dateISO: d.toISOString(), notes: '' }
      await addSession(session)

      // Marker: warmup start
      await addMarker({ id: crypto.randomUUID(), sessionId: session.id, ts: d.valueOf(), label: 'Warmup' })

      // 4–6 batches per session, mixed zones; always include a FT batch
      const batches = []
      const batchCount = rnd(4, 6)
      let addedFT = false

      for (let b = 0; b < batchCount; b++) {
        // Ensure one FT batch
        const isFT = (!addedFT && (b === batchCount - 1 || Math.random() < 0.25))
        const zone = isFT ? 'free_throw' : pick(ZONES.filter(z => z.id !== 'free_throw')).id
        const type = isFT ? 'free_throw' : pick(SHOT_TYPES.filter(t => t.id !== 'free_throw')).id
        const subtype = type === 'off_dribble' ? pick(SUBTYPES).id : 'none'
        const pressured = !isFT && Math.random() < 0.3

        const attempts = isFT ? rnd(20, 40) : rnd(20, 60)
        // Shape makes around 55% mid/paint, 38% 3PT, 85% FT with noise
        let pct = 0.5
        const zMeta = ZONES.find(z => z.id === zone)
        if (isFT) pct = 0.82 + (Math.random() * 0.06 - 0.03)
        else if (zMeta?.isThree) pct = 0.36 + (Math.random() * 0.08 - 0.04)
        else pct = 0.50 + (Math.random() * 0.12 - 0.06)
        if (pressured) pct -= 0.03
        if (type === 'off_dribble') pct -= 0.02

        const makes = Math.max(0, Math.min(attempts, Math.round(attempts * pct)))

        batches.push(makeBatch(session.id, d.add(b * 8, 'minute'), {
          zoneId: zone, shotType: type, subtype, pressured, attempts, makes
        }))

        if (isFT) addedFT = true
        // Add a mid-session marker occasionally
        if (Math.random() < 0.3) {
          await addMarker({
            id: crypto.randomUUID(),
            sessionId: session.id,
            ts: d.add(b * 8 + 4, 'minute').valueOf(),
            label: 'Drill Switch'
          })
        }
      }

      allEntries.push(...batches)
      await addEntries(batches)

      // End marker
      await addMarker({ id: crypto.randomUUID(), sessionId: session.id, ts: d.add(batchCount * 8 + 2, 'minute').valueOf(), label: 'Session End' })
    }
  }
  return allEntries.length
}

async function seedGoals() {
  const setId = crypto.randomUUID()
  const milestone = dayjs().add(5, 'week').format('YYYY-MM-DD')

  await upsertGoalSet({ id: setId, name: 'Preseason 5-week Block', milestoneDate: milestone })

  // Efficiency
  await upsertGoalItem({
    id: crypto.randomUUID(), setId,
    type: 'efg_threshold', target: 55, comparison: 'greater_equal',
    filter: { period: '30d', zone: 'all', shotType: 'any' }
  })

  // Volume
  await upsertGoalItem({
    id: crypto.randomUUID(), setId,
    type: 'weekly_makes', target: 450, comparison: 'greater_equal',
    filter: { period: '7d', zone: 'all', shotType: 'any' }
  })

  // Consistency
  await upsertGoalItem({
    id: crypto.randomUUID(), setId,
    type: 'pressured_pct', target: 45, comparison: 'greater_equal',
    filter: { period: '30d', zone: 'all', shotType: 'any', pressured: true }
  })

  // Future/optional (improvement vs last 30d)
  await upsertGoalItem({
    id: crypto.randomUUID(), setId,
    type: 'fg_zone', target: 42, comparison: 'greater_equal',
    filter: { period: '30d', zone: 'wing_right', shotType: 'off_dribble' }
  })
}

export async function estSeed({ weeks = 5, sessionsPerWeek = 4, startMondayISO = null, push = false } = {}) {
  const count = await seedSessions({ weeks, sessionsPerWeek, startMondayISO })
  await seedGoals()
  if (push) await pushAllLocal()
  return { ok: true, entriesCreated: count }
}

// Expose for console use
if (typeof window !== 'undefined') {
  window.estSeed = estSeed
  console.log('✅ estSeed() available: try  await estSeed({push:true})')
}
