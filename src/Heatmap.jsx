// src/Heatmap.jsx
import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { X } from 'lucide-react'

import courtImg from './images/court-half.svg'
import { ZONES, SHOT_TYPES } from './constants'
import { ZONE_ANCHORS } from './constants/zoneAnchors'
import { getEntries } from './lib/db'

/** --- SPEC CONSTANTS --- */
const METRICS = [
  { key: 'density', label: 'Attempt Density' },
  { key: 'fg',      label: 'FG%' },
  { key: 'ft',      label: 'Free Throws' },
]

const DAYS = [
  {key:'1',   label:'1',   days:1},
  {key:'7',   label:'7',   days:7},
  {key:'30',  label:'30',  days:30},
  {key:'365', label:'365', days:365},
  {key:'all', label:'All', days:Infinity},
]

// Shot filters: keep 'pressured' as its own toggle
const SHOT_FILTERS = [
  { id:'catch_shoot', label:'Catch & Shoot' },
  { id:'off_dribble', label:'Off-Dribble'  },
  { id:'free_throw',  label:'Free Throws'   },
  { id:'pressured',   label:'Pressured'     },
]

/** --- COLOR SCALES (UPPER BOUNDS) --- */
function colorForFG(zoneId, pct) {
  if (zoneId === 'free_throw') {
    // FT scale: 40 red, 65 yellow, 100 green
    if (pct <= 40) return '#ef4444'
    if (pct <= 65) return '#eab308'
    return '#16a34a'
  }
  const isThree = ZONES.find(z => z.id === zoneId)?.isThree
  if (isThree) {
    // 3PT: 20 red, 44 yellow, 100 green
    if (pct <= 20) return '#ef4444'
    if (pct <= 44) return '#eab308'
    return '#16a34a'
  }
  // Midrange: 30 red, 64 yellow, 100 green
  if (pct <= 30) return '#ef4444'
  if (pct <= 64) return '#eab308'
  return '#16a34a'
}

function colorForDensity(ratioPct) {
  // Neutral density scale (kept distinct from FG scales)
  if (ratioPct <= 5)  return '#cbd5e1'  // low
  if (ratioPct <= 12) return '#94a3b8'  // med
  if (ratioPct <= 20) return '#64748b'  // high
  return '#1d4ed8'                      // very high
}

/** --- UI PILL ROW --- */
function ChipRow({ items, activeKey, onClick, label }) {
  return (
    <div className="hm-subrow">
      {label ? <span className="chip-label">{label}</span> : null}
      <div className="chip-group">
        {items.map(it => {
          const key = it.key || it.id || it
          const text = it.label || it
          const active = key === activeKey
          return (
            <button
              key={key}
              className={`chip ${active ? 'chip-on' : 'chip-off'}`}
              onClick={() => onClick(key)}
            >
              {text}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** --- LEGEND COMPONENT --- */
function Legend({ metric }) {
  if (metric === 'density') {
    return (
      <div className="legend-card">
        <div className="legend-title">Attempt Density (share of all attempts in range)</div>
        <div className="legend-grid">
          <div className="legend-item">
            <div className="legend-row"><span className="legend-dot" style={{background:'#cbd5e1'}}></span>
              <span className="legend-text">Low ≤ 5%</span></div>
          </div>
          <div className="legend-item">
            <div className="legend-row"><span className="legend-dot" style={{background:'#94a3b8'}}></span>
              <span className="legend-text">Medium ≤ 12%</span></div>
          </div>
          <div className="legend-item">
            <div className="legend-row"><span className="legend-dot" style={{background:'#64748b'}}></span>
              <span className="legend-text">High ≤ 20%</span></div>
          </div>
          <div className="legend-item sm:col-span-3">
            <div className="legend-row"><span className="legend-dot" style={{background:'#1d4ed8'}}></span>
              <span className="legend-text">Very High &gt; 20%</span></div>
          </div>
        </div>
      </div>
    )
  }

  if (metric === 'fg') {
    return (
      <div className="legend-card">
        <div className="legend-title">FG% color scales (upper bound indicates the end of the range)</div>
        <div className="legend-grid">
          {/* 3-pointer */}
          <div className="legend-item">
            <div className="legend-text font-semibold mb-1">3-pointer</div>
            <div className="legend-row"><span className="legend-dot" style={{background:'#ef4444'}}></span>
              <span className="legend-text">≤ 20%</span></div>
            <div className="legend-row"><span className="legend-dot" style={{background:'#eab308'}}></span>
              <span className="legend-text">≤ 44%</span></div>
            <div className="legend-row"><span className="legend-dot" style={{background:'#16a34a'}}></span>
              <span className="legend-text">≤ 100%</span></div>
          </div>
          {/* Mid-range */}
          <div className="legend-item">
            <div className="legend-text font-semibold mb-1">Mid-range</div>
            <div className="legend-row"><span className="legend-dot" style={{background:'#ef4444'}}></span>
              <span className="legend-text">≤ 30%</span></div>
            <div className="legend-row"><span className="legend-dot" style={{background:'#eab308'}}></span>
              <span className="legend-text">≤ 64%</span></div>
            <div className="legend-row"><span className="legend-dot" style={{background:'#16a34a'}}></span>
              <span className="legend-text">≤ 100%</span></div>
          </div>
          {/* Free Throws */}
          <div className="legend-item">
            <div className="legend-text font-semibold mb-1">Free Throws</div>
            <div className="legend-row"><span className="legend-dot" style={{background:'#ef4444'}}></span>
              <span className="legend-text">≤ 40%</span></div>
            <div className="legend-row"><span className="legend-dot" style={{background:'#eab308'}}></span>
              <span className="legend-text">≤ 65%</span></div>
            <div className="legend-row"><span className="legend-dot" style={{background:'#16a34a'}}></span>
              <span className="legend-text">≤ 100%</span></div>
          </div>
        </div>
      </div>
    )
  }
  
  // metric === 'ft'
  return (
    <div className="legend-card">
      <div className="legend-title">Free Throws (upper bound of each color range)</div>
      <div className="legend-grid sm:grid-cols-1">
        <div className="legend-item">
          <div className="legend-row"><span className="legend-dot" style={{background:'#ef4444'}}></span>
            <span className="legend-text">≤ 40%</span></div>
          <div className="legend-row"><span className="legend-dot" style={{background:'#eab308'}}></span>
            <span className="legend-text">≤ 65%</span></div>
          <div className="legend-row"><span className="legend-dot" style={{background:'#16a34a'}}></span>
            <span className="legend-text">≤ 100%</span></div>
        </div>
      </div>
    </div>
  )
}

export default function Heatmap() {
  const [entries, setEntries] = useState([])
  const [metric, setMetric]   = useState('density')
  const [days, setDays]       = useState('30')
  const [filters, setFilters] = useState(new Set(SHOT_FILTERS.map(f=>f.id))) // all ON by default
  const [modal, setModal]     = useState(null) // {zoneId, stats}

  useEffect(() => { (async () => setEntries(await getEntries()))() }, [])

  const cutoff = useMemo(() => {
    const d = DAYS.find(d => d.key === days)
    return d?.days === Infinity ? null : dayjs().subtract(d.days, 'day')
  }, [days])

  // Apply date + shot-type/pressured filters
  const filtered = useMemo(() => {
    return entries.filter(e => {
      if (cutoff && !dayjs(e.ts).isAfter(cutoff)) return false
      // Shot types ON/OFF
      if (e.shotType === 'catch_shoot' && !filters.has('catch_shoot')) return false
      if (e.shotType === 'off_dribble' && !filters.has('off_dribble')) return false
      if (e.shotType === 'free_throw'  && !filters.has('free_throw'))  return false
      // Pressured filter ON means include pressured. If pressured is OFF, keep both (unless you want "only not pressured")
      if (filters.has('pressured') === false && e.pressured) return false
      return true
    })
  }, [entries, cutoff, filters])

  // Aggregate attempts/makes by zone
  const perZone = useMemo(() => {
    const map = new Map()
    for (const z of ZONES) map.set(z.id, { attempts:0, makes:0 })
    for (const e of filtered) {
      const rec = map.get(e.zoneId)
      if (!rec) continue
      rec.attempts += Number(e.attempts || 0)
      rec.makes    += Number(e.makes || 0)
    }
    return map
  }, [filtered])

  // Denominator for density = all attempts in range (incl. FT), per your spec
  const totalAttempts = useMemo(
    () => [...perZone.values()].reduce((a,r)=>a + r.attempts, 0),
    [perZone]
  )

  // Build zone stats for display
  const zoneStats = useMemo(() => {
    const byId = {}
    for (const z of ZONES) {
      const rec = perZone.get(z.id) || { attempts:0, makes:0 }
      const fg  = rec.attempts ? Math.round((rec.makes/rec.attempts)*100) : 0
      const densityPct = totalAttempts ? Math.round((rec.attempts/totalAttempts)*100) : 0
      byId[z.id] = { id:z.id, label:z.label, attempts:rec.attempts, makes:rec.makes, fg, densityPct }
    }
    return byId
  }, [perZone, totalAttempts])

  // Visible IDs for each metric
  const visibleZoneIds = useMemo(() => {
    if (metric === 'ft') return ['free_throw'] // FT mode: single zone
    return ZONES.filter(z => z.id !== 'free_throw').map(z => z.id)
  }, [metric])

  // Toggle filters handler
  function toggleFilter(id) {
    setFilters(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  // Badge background color by metric + zone
  function badgeColor(id, stats) {
    if (metric === 'density') return colorForDensity(stats?.densityPct || 0)
    if (metric === 'fg')      return colorForFG(id, stats?.fg || 0)
    // ft
    return colorForFG('free_throw', stats?.fg || 0)
  }

  // Badge text by metric + zone
  function badgeLines(id, stats) {
    if (metric === 'density') {
      return [stats.label, `${stats.attempts} • ${stats.densityPct}%`]
    }
    if (metric === 'fg') {
      return [stats.label, `${stats.fg}%`]
    }
    // ft
    return ['Free Throw', `${stats.attempts} • ${stats.fg}%`]
  }

  return (
    <div className="mx-auto max-w-3xl px-3 sm:px-4 pb-24 text-slate-900">
      {/* Header */}
      <header className="mb-2">
        <h2 className="text-xl font-bold">Heatmap</h2>
        <p className="muted">Tap a zone to see details</p>
      </header>

      {/* Row 1: Metric pills */}
      <ChipRow items={METRICS} activeKey={metric} onClick={setMetric} />

      {/* Row 2: Days pills with "Days:" label */}
      <ChipRow items={DAYS} activeKey={days} onClick={setDays} label="Days:" />

     {/* Shot filters */}
      <div className="hm-subrow">
        <div className="chip-group">
          {SHOT_FILTERS.map(f => (
            <button
              key={f.id}
              className={`chip ${filters.has(f.id) ? 'chip-on' : 'chip-off'}`}
              onClick={() => toggleFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* --- Court with SVG background + anchored badges --- */}
      <section className="hm-card">
        <svg viewBox="0 0 671 995" className="w-full h-auto">
          <image
            href={courtImg}
            x={0} y={0}
            width={671} height={995}
            preserveAspectRatio="xMidYMid meet"
          />
          {/* Badges */}
          {visibleZoneIds.map(id => {
            const p = ZONE_ANCHORS[id]
            if (!p) return null // skip if not calibrated
            const stats = zoneStats[id] || { label:id, attempts:0, fg:0, densityPct:0 }
            const bg = badgeColor(id, stats)
            const lines = badgeLines(id, stats)
            return (
              <g className="zone-badge" key={id} transform={`translate(${p.x}, ${p.y})`} onClick={()=>setModal({ zoneId:id, stats, metric })} style={{ cursor:'pointer' }}>
                <rect x={-50} y={-18} width={100} height={28} rx={8} fill={bg} />
                <text x="0" y="-3" textAnchor="middle" fontSize="11" fill="#fff" fontWeight="700">
                  {lines[0]}
                </text>
                <text x="0" y="11" textAnchor="middle" fontSize="11" fill="#fff" fontWeight="700">
                  {lines[1]}
                </text>
              </g>
            )
          })}
        </svg>

        {/* --- Legend --- */}
        <Legend metric={metric} />

      </section>

      {/* --- Modal --- */}
      {modal && (
        <div className="modal-scrim" onClick={()=>setModal(null)}>
          <div className="modal-card" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-base font-semibold">
                {ZONES.find(z=>z.id===modal.zoneId)?.label || 'Zone'}
              </h4>
              <button className="btn btn-quiet" onClick={()=>setModal(null)}><X size={16}/></button>
            </div>
            <div className="text-sm">
              <div className="flex justify-between py-1">
                <span className="text-slate-600">Attempts</span>
                <b>{modal.stats.attempts || 0}</b>
              </div>
              {modal.metric !== 'density' && (
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">FG%</span>
                  <b>{modal.stats.fg || 0}%</b>
                </div>
              )}
              {modal.metric === 'density' && (
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">Attempt Share</span>
                  <b>{modal.stats.densityPct || 0}%</b>
                </div>
              )}
            </div>
            {/* Mini-chart could go here later */}
            <div className="mt-3 text-xs text-slate-500">
              Filtered over: {DAYS.find(d=>d.key===days)?.label} day(s). Toggle shot-type pills to refine.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
