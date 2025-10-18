import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { getEntries } from './lib/db'
import { efg as efgCalc } from './types'

/**
 * Simple half-court SVG (approx geometry):
 * width: 500, height: 470
 * Zones cover: corners, wings, top, mid L/R, elbows, paint, restricted, short corners, FT.
 */
const SVG_W = 500
const SVG_H = 470

// zone metadata (id, label, isThree, and an SVG shape to draw)
const ZONES = [
  // Perimeter 3PT
  { id:'corner_left',  label:'Corner L',  isThree:true,  shape:{ type:'rect', x:10,  y:310, w:80,  h:140 } },
  { id:'wing_left',    label:'Wing L',    isThree:true,  shape:{ type:'rect', x:90,  y:260, w:120, h:190 } },
  { id:'top',          label:'Top',       isThree:true,  shape:{ type:'rect', x:210, y:250, w:80,  h:200 } },
  { id:'wing_right',   label:'Wing R',    isThree:true,  shape:{ type:'rect', x:290, y:260, w:120, h:190 } },
  { id:'corner_right', label:'Corner R',  isThree:true,  shape:{ type:'rect', x:410, y:310, w:80,  h:140 } },

  // Midrange band
  { id:'mid_left',     label:'Mid L',     isThree:false, shape:{ type:'rect', x:90,  y:190, w:120, h:70 } },
  { id:'elbow_left',   label:'Elbow L',   isThree:false, shape:{ type:'rect', x:150, y:140, w:60,  h:50 } },
  { id:'mid_right',    label:'Mid R',     isThree:false, shape:{ type:'rect', x:290, y:190, w:120, h:70 } },
  { id:'elbow_right',  label:'Elbow R',   isThree:false, shape:{ type:'rect', x:290, y:140, w:60,  h:50 } },
  { id:'short_left',   label:'Short L',   isThree:false, shape:{ type:'rect', x:90,  y:320, w:100, h:60 } },
  { id:'short_right',  label:'Short R',   isThree:false, shape:{ type:'rect', x:310, y:320, w:100, h:60 } },

  // Paint
  { id:'paint',             label:'Paint',        isThree:false, shape:{ type:'rect', x:200, y:140, w:100, h:160 } },
  { id:'paint_restricted',  label:'Restricted',   isThree:false, shape:{ type:'rect', x:215, y:155, w:70,  h:90 } },

  // Free throw (render as a badge above the lane)
  { id:'free_throw',   label:'FT', isThree:false, shape:{ type:'rect', x:215, y:105, w:70, h:30 } }
]

// color scale similar to NBA charts (red→yellow→green)
function colorForPct(pct) {
  if (pct === null) return '#d1d5db' // no data
  // thresholds you can tweak:
  // <35% red, 35–45% yellow, >45% green (applies to FG%; eFG% will naturally be higher)
  if (pct < 35) return '#ef4444'
  if (pct < 40) return '#f59e0b'
  if (pct < 45) return '#eab308'
  if (pct < 50) return '#84cc16'
  return '#22c55e'
}

export default function CourtHeatmap() {
  const [entries, setEntries] = useState([])
  const [range, setRange] = useState('30')         // 7 | 30 | 365 | all
  const [metric, setMetric] = useState('fg')       // 'fg' or 'efg'
  const [showCounts, setShowCounts] = useState(true)

  useEffect(() => { (async () => setEntries(await getEntries()))() }, [])

  const filtered = useMemo(() => {
    if (range === 'all') return entries
    const days = Number(range)
    const start = dayjs().subtract(days - 1, 'day').startOf('day')
    return entries.filter(e => dayjs(e.ts).isAfter(start))
  }, [entries, range])

  // aggregate
  const byZone = useMemo(() => {
    const map = new Map()
    for (const z of ZONES) map.set(z.id, { attempts:0, makes:0, threesMade:0, isThree:z.isThree })
    for (const e of filtered) {
      if (!map.has(e.zoneId)) map.set(e.zoneId, { attempts:0, makes:0, threesMade:0, isThree:false })
      const t = map.get(e.zoneId)
      t.attempts += e.attempts
      t.makes    += e.makes
      if (e.isThree) t.threesMade += e.makes
    }
    // compute pct for label
    for (const [id,t] of map) {
      const fg = t.attempts ? (t.makes / t.attempts) * 100 : null
      const ef = t.attempts ? (efgCalc(t) * 100) : null
      map.set(id, { ...t, fgPct: fg, efgPct: ef })
    }
    return map
  }, [filtered])

  return (
    <div style={{ padding:16, fontFamily:'system-ui, -apple-system, Segoe UI, Roboto', maxWidth:900, margin:'0 auto' }}>
      <h2>Shot Chart</h2>
      <div style={{ display:'flex', gap:12, flexWrap:'wrap', margin:'8px 0 12px' }}>
        <label>Range:{' '}
          <select value={range} onChange={e=>setRange(e.target.value)}>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="365">Last 365 days</option>
            <option value="all">All time</option>
          </select>
        </label>
        <label>Metric:{' '}
          <select value={metric} onChange={e=>setMetric(e.target.value)}>
            <option value="fg">FG%</option>
            <option value="efg">eFG%</option>
          </select>
        </label>
        <label><input type="checkbox" checked={showCounts} onChange={e=>setShowCounts(e.target.checked)} /> Show makes/attempts</label>
      </div>

      <div style={{ border:'1px solid #e5e7eb', borderRadius:12, overflow:'hidden', background:'#f1f5f9' }}>
        <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} width="100%" height="auto" style={{ display:'block' }}>
          {/* Court lines (very light) */}
          <rect x="0" y="0" width={SVG_W} height={SVG_H} fill="#f8fafc" />
          <rect x="200" y="140" width="100" height="190" fill="none" stroke="#334155" strokeWidth="2" opacity="0.2" />
          <circle cx="250" cy="235" r="45" fill="none" stroke="#334155" strokeWidth="2" opacity="0.15" />
          <rect x="0" y="250" width={SVG_W} height="220" fill="none" stroke="#334155" strokeWidth="2" opacity="0.1" />
          {/* Rim */}
          <circle cx="250" cy="205" r="7.5" fill="none" stroke="#111827" strokeWidth="3" opacity="0.35" />

          {/* Zones */}
          {ZONES.map((z) => {
            const t = byZone.get(z.id) || { attempts:0, makes:0, fgPct:null, efgPct:null }
            const pct = metric === 'fg' ? t.fgPct : t.efgPct
            const fill = colorForPct(pct === null ? null : pct)
            const { type, x, y, w, h } = z.shape

            // label
            const cx = x + w/2
            const cy = y + h/2
            const labelPct = pct === null ? '—' : `${pct.toFixed(2)}`.replace(/\.00$/,'') + '%'
            const labelMA  = `${t.makes} / ${t.attempts}`

            return (
              <g key={z.id}>
                {type === 'rect' && (
                  <rect x={x} y={y} width={w} height={h} rx="10" ry="10" fill={fill} opacity="0.9" />
                )}
                <text x={cx} y={cy - 6} textAnchor="middle" fontSize="12" fontWeight="700" fill="#ffffff">
                  {labelMA}{showCounts ? '' : ''}
                </text>
                <text x={cx} y={cy + 12} textAnchor="middle" fontSize="12" fill="#ffffff" opacity="0.95">
                  {labelPct}
                </text>
              </g>
            )
          })}
        </svg>
        <div style={{ padding:'8px 12px', fontSize:12, color:'#475569' }}>
          * Colors: red (low) → yellow → green (high). Layout is approximate for quick read.
        </div>
      </div>
    </div>
  )
}
