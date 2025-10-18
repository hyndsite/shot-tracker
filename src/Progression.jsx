import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { getEntries } from './lib/db'
import { efg } from './types'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

export default function Progression() {
  const [entries, setEntries] = useState([])
  const [span, setSpan] = useState('60') // 30 | 60 | 180 | all

  useEffect(() => { (async () => setEntries(await getEntries()))() }, [])

  const data = useMemo(() => {
    const map = new Map()
    const minDate = span === 'all'
      ? dayjs('2000-01-01')
      : dayjs().subtract(Number(span) - 1, 'day').startOf('day')
    for (const e of entries) {
      const d = dayjs(e.ts).format('YYYY-MM-DD')
      if (dayjs(d).isBefore(minDate)) continue
      if (!map.has(d)) map.set(d, { attempts:0, makes:0, threesMade:0 })
      const t = map.get(d)
      t.attempts += e.attempts
      t.makes    += e.makes
      if (e.isThree) t.threesMade += e.makes
    }
    return Array.from(map.entries())
      .sort((a,b) => a[0] < b[0] ? -1 : 1)
      .map(([d,t]) => ({ date:d, efg:+(efg(t)*100).toFixed(1), att:t.attempts }))
  }, [entries, span])

  return (
    <div style={{ padding:16, fontFamily:'system-ui, -apple-system, Segoe UI, Roboto', maxWidth:900, margin:'0 auto' }}>
      <h2>Progression</h2>
      <div style={{ display:'flex', gap:8, margin:'8px 0' }}>
        <label>Range:{' '}
          <select value={span} onChange={e=>setSpan(e.target.value)}>
            <option value="30">30 days</option>
            <option value="60">60 days</option>
            <option value="180">180 days</option>
            <option value="all">All time</option>
          </select>
        </label>
      </div>

      <div style={{ height:280, border:'1px solid #e5e7eb', borderRadius:12, padding:8 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top:10, right:20, bottom:10, left:0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize:12 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize:12 }} />
            <Tooltip />
            <Line type="monotone" dataKey="efg" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div style={{ fontSize:12, color:'#475569', marginTop:6 }}>
        Line shows daily eFG%; we can add attempts overlay later.
      </div>
    </div>
  )
}