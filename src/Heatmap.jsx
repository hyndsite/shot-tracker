import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { getEntries } from './lib/db'
import { ZONES } from './constants'
import { efg } from './types'

const GRID = [
  ['corner_left','wing_left','top','wing_right','corner_right'],
  ['elbow_left','mid_left','paint','mid_right','elbow_right'],
  ['short_left','paint_restricted','free_throw','paint_restricted','short_right']
]

function statColor(val) {
  const t = Math.max(0, Math.min(1, val))
  const g = Math.round(200 * t)
  const b = Math.round(200 * (1 - t))
  return `rgb(20, ${g}, ${b})`
}

export default function Heatmap() {
  const [entries, setEntries] = useState([])
  const [mode, setMode] = useState('density') // density | accuracy | efg
  const [range, setRange] = useState('30')     // 7 | 30 | 365 | all

  useEffect(() => { (async () => setEntries(await getEntries()))() }, [])

  const filtered = useMemo(() => {
    if (range === 'all') return entries
    const days = Number(range)
    const start = dayjs().subtract(days - 1, 'day').startOf('day')
    return entries.filter(e => dayjs(e.ts).isAfter(start))
  }, [entries, range])

  const zone = new Map()
  for (const z of ZONES) zone.set(z.id, { attempts:0, makes:0, threesMade:0 })
  for (const e of filtered) {
    const t = zone.get(e.zoneId) || { attempts:0, makes:0, threesMade:0 }
    t.attempts += e.attempts
    t.makes    += e.makes
    if (e.isThree) t.threesMade += e.makes
    zone.set(e.zoneId, t)
  }

  const maxAtt = Math.max(1, ...Array.from(zone.values()).map(v => v.attempts))

  const cellStat = (zid) => {
    const t = zone.get(zid) || { attempts:0, makes:0, threesMade:0 }
    if (mode === 'density') return { label: `${t.attempts} att`, ratio: t.attempts / maxAtt }
    if (mode === 'accuracy') {
      const r = t.attempts ? t.makes / t.attempts : 0
      return { label: t.attempts ? `${(r * 100).toFixed(0)}%` : '—', ratio: r }
    }
    const r = t.attempts ? efg(t) : 0
    return { label: t.attempts ? `${(r * 100).toFixed(0)}% eFG` : '—', ratio: r }
  }

  return (
    <div style={{ padding:16, fontFamily:'system-ui, -apple-system, Segoe UI, Roboto', maxWidth:900, margin:'0 auto' }}>
      <h2>Shot Map (Zones)</h2>

      <div style={{ display:'flex', gap:8, margin:'8px 0' }}>
        <label>Mode:{' '}
          <select value={mode} onChange={e=>setMode(e.target.value)}>
            <option value="density">Attempt Density</option>
            <option value="accuracy">FG% (per zone)</option>
            <option value="efg">eFG% (per zone)</option>
          </select>
        </label>
        <label>Range:{' '}
          <select value={range} onChange={e=>setRange(e.target.value)}>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="365">Last 365 days</option>
            <option value="all">All time</option>
          </select>
        </label>
      </div>

      <div style={{ border:'1px solid #e5e7eb', borderRadius:12, padding:12 }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8 }}>
          {GRID.flat().map((zid, i) => {
            const meta = ZONES.find(z => z.id === zid)
            const { label, ratio } = cellStat(zid)
            const color = statColor(ratio)
            return (
              <div key={i} style={{
                background: color, color:'white', borderRadius:10, padding:'16px 8px',
                textAlign:'center', minHeight:64, display:'flex', flexDirection:'column', justifyContent:'center'
              }}>
                <div style={{ fontWeight:700, fontSize:13 }}>{meta ? meta.label : zid}</div>
                <div style={{ fontSize:12, opacity:0.9 }}>{label}</div>
              </div>
            )
          })}
        </div>
        <div style={{ fontSize:12, color:'#475569', marginTop:8 }}>
          * Grid approximates zones for speed; not literal court geometry.
        </div>
      </div>
    </div>
  )
}
