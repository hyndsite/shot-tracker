import dayjs from 'dayjs'
import { efg as calcEfg } from '../types'

/**
 * Goal item shape:
 * {
 *   id, setId,
 *   type: 'efg_threshold'|'weekly_makes'|'fg_zone'|'three_pt'|'ft_pct'|'streak_days'|'attempts_period'|...,
 *   target: number,
 *   comparison: 'greater_equal'|'less_equal'|'equal',
 *   filter: { period?: '7d'|'30d'|'365d'|'all', zone?: string|'all', shotType?: string|'any', pressured?: boolean|null }
 * }
 */

export function filterEntries(entries, filter, untilMillis = Date.now()) {
  const f = filter || {}
  let start = dayjs(0)
  if (f.period && f.period !== 'all') {
    const n = parseInt(f.period)
    start = dayjs(untilMillis).subtract(n - 1, 'day').startOf('day')
  }
  return entries.filter(e => {
    if (f.zone && f.zone !== 'all' && e.zoneId !== f.zone) return false
    if (f.shotType && f.shotType !== 'any' && e.shotType !== f.shotType) return false
    if (typeof f.pressured === 'boolean' && !!e.pressured !== f.pressured) return false
    if (f.isThree === true && !e.isThree) return false
    if (f.isThree === false && e.isThree) return false
    return dayjs(e.ts).isAfter(start)
  })
}

export function computeMetric(entries, type) {
  const totals = entries.reduce((a,e)=> {
    a.att += e.attempts; a.mk += e.makes; if (e.isThree) a.t3 += e.makes; return a
  }, { att:0, mk:0, t3:0 })
  switch (type) {
    case 'efg_threshold': return totals.att ? calcEfg({ attempts:totals.att, makes:totals.mk, threesMade:totals.t3 }) * 100 : 0
    case 'fg_zone':
    case 'three_pt':
    case 'ft_pct':
    case 'off_dribble_pct':
    case 'pressured_pct':
      return totals.att ? (totals.mk / totals.att) * 100 : 0
    case 'weekly_makes':
    case 'attempts_period':
    case 'ft_makes_weekly':
    case 'catch_shoot_volume':
      return totals.mk // or attempts depending on the goal design
    case 'attempts':
      return totals.att
    default:
      return totals.att ? (totals.mk / totals.att) * 100 : 0
  }
}

export function compare(val, target, comparison) {
  if (comparison === 'greater_equal') return val >= target
  if (comparison === 'less_equal')    return val <= target
  return Math.abs(val - target) < 1e-9
}

/**
 * Evaluate a goal item against entries up to a milestone date.
 * Returns { value, met, pctToTarget }
 */
export function evaluateGoal(entries, goalItem, milestoneDateISO) {
  const until = milestoneDateISO ? dayjs(milestoneDateISO).endOf('day').valueOf() : Date.now()
  const sub = filterEntries(entries, goalItem.filter, until)
  const value = computeMetric(sub, goalItem.type)
  const target = Number(goalItem.target || 0)
  const met = compare(value, target, goalItem.comparison)
  const pctToTarget = target ? Math.min(100, (value / target) * 100) : 0
  return { value, met, pctToTarget }
}
